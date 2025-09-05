# frozen_string_literal: true

module Usecases
  module Collections
    class Create
      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
      end

      def perform!(parent_id:, label:, inventory_id:)
        collection = create_collection(
          parent: parent(parent_id), 
          label: label, 
          inventory: inventory(inventory_id)
        )
        adjust_positions_within_same_generation(collection)
        collection.reload # update record to reflect updated position
      end

      private

      def parent(parent_id)
        return unless parent_id

        current_user.collections.find(parent_id) if parent_id.present? # NOTE: own collections only
      end

      # TODO: how are inventories access controlled?
      def inventory(inventory_id)
        return unless inventory_id

        Inventory.find(inventory_id)
      end

      def create_collection(parent:, label:, inventory:)
        # the new child collection will be created with position 0, 
        # the position will be adjusted to 1 afterwards

        current_user.collections.create!(
          parent: parent,
          position: 0,
          label: label,
          inventory: inventory
        )
      end

      def adjust_positions_within_same_generation(collection)
        current_user
          .collections
          .where(ancestry: collection.ancestry)
          .update_all('position = position + 1')
      end
    end
  end
end
