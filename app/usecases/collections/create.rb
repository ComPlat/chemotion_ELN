# frozen_string_literal: true

module Usecases
  module Collections
    class Create
      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
      end

      def perform!(parent_id:, label:, inventory_id:)
        inventory = find_inventory(inventory_id)
        if parent_id
          parent = find_parent(parent_id)
          position = parent.children.count + 1
        else
          parent = nil
          position = current_user.collections.where(ancestry: '/').count + 1
        end

        # is_locked is deliberately forced false: locked collections (the "All", repository and
        # transferred roots) are system-generated only, and this is the sole user-facing create
        # path. Hard-coding it here keeps a user from ever minting a locked collection even if the
        # flag later leaks into the endpoint params.
        current_user.collections.create!(
          parent: parent,
          position: position,
          label: label,
          inventory: inventory,
          is_locked: false,
        )
      end

      private

      def find_parent(parent_id)
        return unless parent_id

        current_user.collections.find(parent_id) if parent_id.present? # NOTE: own collections only
      end

      # TODO: how are inventories access controlled?
      def find_inventory(inventory_id)
        return unless inventory_id

        Inventory.find(inventory_id)
      end
    end
  end
end
