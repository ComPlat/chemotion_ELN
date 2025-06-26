# frozen_string_literal: true

# Use case for deleting components that are no longer present in the update payload for a sample.
# Finds all components for the sample whose molecule_id is not in the provided list and deletes them.
module Usecases
  module Components
    class DeleteRemovedComponents
      def initialize(sample_id, components_params)
        @sample_id = sample_id
        @components_params = components_params
      end

      def execute!
        # Collect molecule_ids to keep from the incoming params
        molecule_ids_to_keep = @components_params.filter_map do |cp|
          cp.dig(:component_properties, :molecule_id)&.to_i
        end

        # Delete all components for the sample whose molecule_id is not in the keep list
        Component.where(sample_id: @sample_id)
                 .where.not("CAST(component_properties ->> 'molecule_id' AS INTEGER) IN (?)", molecule_ids_to_keep)
                 .destroy_all
      end
    end
  end
end
