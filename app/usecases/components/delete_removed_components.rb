# frozen_string_literal: true

# Use case for deleting components that are no longer present in the update payload for a sample.
# Finds all existing components for the sample whose id is not in the provided list and deletes them.
module Usecases
  module Components
    class DeleteRemovedComponents
      def initialize(sample_id, components_params)
        @sample_id = sample_id
        @components_params = components_params.map(&:with_indifferent_access)
      end

      def execute!
        # Collect existing component ids to keep. Non-integer ids (e.g. client-side
        # placeholders like 'new_1') correspond to brand-new components and are
        # ignored here; they are inserted by Usecases::Components::Create.
        ids_to_keep = @components_params.filter_map do |cp|
          Integer(cp[:id], exception: false)
        end

        scope = Component.where(sample_id: @sample_id)
        scope = scope.where.not(id: ids_to_keep) if ids_to_keep.any?
        scope.destroy_all
      end
    end
  end
end
