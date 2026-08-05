# frozen_string_literal: true

module Usecases
  module Collections
    class RemoveElements
      include ElementClassResolution

      # Join tables whose remove_in_collection cascades down to CollectionsSample and therefore
      # returns the sample ids kept back by the association guard — either directly
      # (CollectionsSample) or via their child samples (removing a reaction/wellplate/screen
      # cascades to its samples, which may still be locked by another association).
      SAMPLE_LOCKING_JOIN_TABLES = [
        CollectionsSample,
        CollectionsReaction,
        CollectionsWellplate,
        CollectionsScreen,
      ].freeze

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
          element_ids = resolve_element_ids(class_string, ui_selections)
          next if element_ids.blank?

          join_table = join_table_for(class_string)

          kept = join_table.remove_in_collection(element_ids, collection.id)
          # capture kept sample ids, whether the sample was selected directly or reached through a
          # selected reaction/wellplate/screen cascade (which can leave a sample locked by another
          # association)
          @locked_sample_ids |= Array(kept) if SAMPLE_LOCKING_JOIN_TABLES.include?(join_table)
        end

        reconcile_locked_sample_ids
      end

      # ui_state is processed in the client's key order (sample before reaction/wellplate), so a
      # sample flagged as kept during the sample pass can still be removed later in the same request
      # when a selected reaction/wellplate pass cascades to it
      # (CollectionsReaction/CollectionsWellplate#remove_in_collection). Reconcile against final
      # membership so only samples that truly remain in the collection are reported as locked.
      def reconcile_locked_sample_ids
        return if @locked_sample_ids.empty?

        @locked_sample_ids = CollectionsSample
                             .where(collection_id: collection.id, sample_id: @locked_sample_ids)
                             .pluck(:sample_id)
      end

      # Resolves selected element ids within the current collection. Must scope before
      # +by_ui_state+: with +checkedAll+, that scope expands to +where.not(id: ...)+ on its
      # receiver, so an unscoped class would load every record of that type (full-table scan /
      # huge id lists). Same approach as {WithdrawElements}.
      def resolve_element_ids(class_string, ui_selections)
        scope = collection_scoped_elements(class_string)
        return [] unless scope

        scope.by_ui_state(ui_selections).ids
      end

      # Collection association for a UI element-type key (built-in or Labimotion generic).
      def collection_scoped_elements(class_string)
        if (klass = API::ELEMENT_CLASS[class_string])
          collection.send(klass.model_name.route_key)
        elsif (element_klass = Labimotion::ElementKlass.find_by(name: class_string))
          collection.elements.merge(element_klass.elements)
        end
      end
    end
  end
end
