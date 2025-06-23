# frozen_string_literal: true

# Use case for creating or updating components for a given sample.
# Iterates through the provided components, finds or initializes each by sample and molecule_id,
# assigns attributes, and saves with validation.
module Usecases
  module Components
    class Create
      def initialize(sample_id, components)
        @sample_id = sample_id
        @components = components
      end

      def execute!
        @components.each do |component_params|
          molecule_id = component_params.dig(:component_properties, :molecule_id).to_i

          component = Component
                      .where("sample_id = ? AND CAST(component_properties ->> 'molecule_id' AS INTEGER) = ?",
                             @sample_id, molecule_id)
                      .first_or_initialize(sample_id: @sample_id)

          component.assign_attributes(
            name: component_params[:name],
            position: component_params[:position],
            component_properties: component_params[:component_properties],
          )
          component.save! # Will raise ActiveRecord::RecordInvalid if validation fails
        end
      end
    end
  end
end
