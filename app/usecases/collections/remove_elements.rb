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

        # Samples linked to a reaction or wellplate still in the collection are kept on purpose
        # (they belong to that reaction/wellplate). Report them so the UI can tell the user why
        # the sample was not removed.
        { locked_sample_ids: @locked_sample_ids }
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
        @locked_sample_ids = []
        ui_state.each do |class_string, ui_selections|
          element_class = element_scope_for(class_string)
          next unless element_class

          element_ids = resolve_element_ids(element_class, ui_selections)
          join_table = join_table_for(class_string)

          kept = join_table.remove_in_collection(element_ids, collection.id)
          # only the samples join table reports kept-by-reaction/wellplate sample ids
          @locked_sample_ids |= Array(kept) if join_table == CollectionsSample
        end
      end

      # Resolves the selected element ids. Samples are scoped to the collection so a checkedAll
      # selection does not resolve to every sample in the database (by_ui_state has no collection
      # filter of its own).
      def resolve_element_ids(element_class, ui_selections)
        scope = element_class == Sample ? collection.samples : element_class
        scope.by_ui_state(ui_selections).ids
      end
    end
  end
end
