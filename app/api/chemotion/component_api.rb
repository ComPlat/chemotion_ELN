# frozen_string_literal: true

module Chemotion
  class ComponentAPI < Grape::API
    resource :components do
      desc 'Return components by sample_id'
      params do
        requires :sample_id, type: Integer, desc: 'sample id'
      end

      get do
        Component.where(sample_id: params[:sample_id])
      end

      desc 'Save or update components for a given sample'
      params do
        requires :sample_id, type: Integer, desc: 'sample id'
        requires :components, type: Array, desc: 'components'
      end

      put do
        sample_id = params[:sample_id]
        components_params = params[:components]

        components_params.each do |component_params|
          component_id = component_params[:id]
          component = Component.find_or_create_by(id: component_id, sample_id: sample_id)
          component.update(
            name: component_params[:name],
            position: component_params[:position],
            component_properties: component_params[:component_properties],
          )
        end
      end
    end
  end
end
