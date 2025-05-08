# frozen_string_literal: true

module Chemotion
  class ComponentAPI < Grape::API
    resource :components do
      desc 'Return components by sample_id'
      params do
        requires :sample_id, type: Integer, desc: 'sample id'
      end

      route_param :sample_id do
        get do
          components = Component.where(sample_id: params[:sample_id])
          components_with_molecule_data = components.map do |component|
            molecule_id = component.component_properties['molecule_id']
            molecule = Molecule.find_by(id: molecule_id)
            component.component_properties['molecule'] = molecule
            component
          end
          present components_with_molecule_data
        end
      end

      desc 'Save or update components for a given sample'
      params do
        requires :sample_id, type: Integer, desc: 'sample id'
        requires :components, type: Array, desc: 'components' do
          requires :id, types: [Integer, String], desc: 'Component ID'
          optional :name, type: String, desc: 'Component name'
          optional :position, type: Integer, desc: 'Component position in the table'
          requires :component_properties, type: Hash, desc: 'Component properties' do
            optional :amount_mol, type: Float, desc: 'Component moles'
            optional :amount_l, type: Float, desc: 'Component volume'
            optional :amount_g, type: Float, desc: 'Component mass'
            optional :density, type: Float, desc: 'Density in g/ml'
            optional :molarity_unit, type: String, desc: 'Molarity unit'
            optional :molarity_value, type: Float, desc: 'Molarity value'
            optional :starting_molarity_value, type: Float, desc: 'Starting molarity value'
            optional :starting_molarity_unit, type: String, desc: 'Starting molarity unit'
            requires :molecule_id, type: Integer, desc: 'Molecule ID'
            optional :equivalent, types: [Float, String], desc: 'Equivalent'
            optional :parent_id, type: Integer, desc: 'Parent ID'
            optional :material_group, type: String, desc: 'type of component e.g. liquid'
            optional :reference, type: Boolean, desc: 'reference comp. for ratio calculations'
            optional :purity, type: Float, desc: 'Component purity'
          end
        end
      end

      put do
        sample_id = params[:sample_id]
        components_params = params[:components]

        ActiveRecord::Base.transaction do
          components_params.each do |component_params|
            molecule_id = component_params.dig(:component_properties, :molecule_id).to_i

            component = Component.where("sample_id = ? AND CAST(component_properties ->> 'molecule_id' AS INTEGER) = ?",
                                        sample_id, molecule_id)
                                 .first_or_initialize(sample_id: sample_id)

            component.update(
              name: component_params[:name],
              position: component_params[:position],
              component_properties: component_params[:component_properties],
            )
          end

          # Delete components
          molecule_ids_to_keep = components_params.filter_map { |cp| cp.dig(:component_properties, :molecule_id)&.to_i }

          Component.where(sample_id: sample_id)
                   .where.not("CAST(component_properties ->> 'molecule_id' AS INTEGER) IN (?)", molecule_ids_to_keep)
                   &.destroy_all
        end
      end
    end
  end
end
