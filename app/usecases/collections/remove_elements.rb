# frozen_string_literal: true

module Usecases
  module Collections
    class RemoveElements
      include ElementClassResolution

      attr_reader :current_user, :collection

      def initialize(current_user)
        @current_user = current_user
        @collection = nil
      end

      def perform!(collection_id:, ui_state:)
        find_collection(collection_id)
        prevent_removal_from_all_collection!
        remove_elements_from_collection(ui_state)

        # Samples linked to a reaction that is still in the collection are kept
        # on purpose (they belong to the reaction). Report them so the UI can
        # tell the user why the sample was not unshared.
        { locked_sample_ids: locked_sample_ids }
      end

      # rubocop:disable Rails/FindByOrAssignmentMemoization
      def find_collection(collection_id)
        @collection = Collection.own_collections_for(current_user).find_by(id: collection_id)
        @collection ||= Collection.shared_with_minimum_permission_level(
          current_user,
          CollectionShare.permission_level(:remove_elements),
        ).find_by(id: collection_id)

        return if @collection

        raise Errors::InsufficientPermissionError, 'You do not have the right to remove elements from this collection'
      end
      # rubocop:enable Rails/FindByOrAssignmentMemoization

      def prevent_removal_from_all_collection!
        return unless collection.label == 'All' && collection.is_locked

        raise Errors::InsufficientPermissionError, 'You can not delete from an ALL-Collection'
      end

      def remove_elements_from_collection(ui_state)
        @requested_sample_ids = []
        ui_state.each do |class_string, ui_selections|
          element_class = element_scope_for(class_string)
          next unless element_class

          element_ids = element_class.by_ui_state(ui_selections).ids
          @requested_sample_ids = element_ids if element_class == Sample
          join_table_for(class_string).remove_in_collection(element_ids, collection.id)
        end
      end

      # Samples the user asked to remove but which stayed in the collection
      # because they are connected to a reaction that is also in the collection.
      def locked_sample_ids
        CollectionsSample.locked_by_reaction(@requested_sample_ids, collection.id)
      end
    end
  end
end
