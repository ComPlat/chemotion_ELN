# frozen_string_literal: true

module Chemotion
  class ComponentAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('Resource not found', 404)
    end

    rescue_from ActiveRecord::RecordInvalid do |e|
      error!(e.record.errors.full_messages.to_sentence, 422)
    end

    helpers do
      def authorize_sample_update!(sample)
        return if ElementPolicy.new(current_user, sample).update?

        error!('403 Forbidden', 403)
      end
    end

    resource :components do
      desc 'Return components by sample_id'
      params do
        requires :sample_id, type: Integer, desc: 'sample id'
      end

      route_param :sample_id do
        get do
          components = Component.where(sample_id: params[:sample_id])
          molecule_ids = components
                         .filter_map { |component| component.component_properties['molecule_id'] }.uniq
          molecules = Molecule.where(id: molecule_ids).index_by(&:id)

          components.each do |component|
            molecule_id = component.component_properties['molecule_id']
            component.component_properties['molecule'] = molecules[molecule_id]
          end

          present components, with: Entities::ComponentEntity
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
        sample = Sample.find(params[:sample_id])
        authorize_sample_update!(sample)

        ActiveRecord::Base.transaction do
          Usecases::Components::Create.new(sample.id, params[:components]).execute!
          Usecases::Components::DeleteRemovedComponents.new(sample.id, params[:components]).execute!
        end
        present Component.where(sample_id: sample.id), with: Entities::ComponentEntity
      end
    end
  end
end
