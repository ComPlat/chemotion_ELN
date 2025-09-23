# frozen_string_literal: true

module Usecases
  module Collections
    class UpdateTree
      attr_reader :current_user, :linear_tree_structure

      def initialize(current_user)
        @current_user = current_user
        @linear_tree_structure = []
      end

      def perform!(collections:)
        # The counter is used to create a global position (global meaning within the collection tree of 1 user)
        #
        collections.each.with_index do |collection, index|
          add_collection_and_children_to_linear_tree(collection, position: index + 1)
        end

        save_linear_tree_structure!
      end

      private

      def collections_permitted_to_update
        @collections_permitted_to_update ||= Collection.own_collections_for(current_user).ids
      end

      def add_collection_and_children_to_linear_tree(collection, parent_ids: [], position:)
        collection_id = collection[:id].to_i
        raise Errors::UpdateForbidden.new unless collection_id.in?(collections_permitted_to_update)

        ancestry = wrap_parent_ids(parent_ids)
        entry = {
          id: collection_id,
          label: collection[:label],
          position: position,
          ancestry: ancestry,
          user_id: current_user.id
        }

        add_collection_to_linear_tree(entry)

        (collection[:children] || []).each_with_index do |child_collection, index|
          # IMPORTANT: this must return a new Array, otherwise the recursion breaks the parent structure
          parent_ids_of_child = parent_ids + [collection_id]
          
          add_collection_and_children_to_linear_tree(child_collection, parent_ids: parent_ids_of_child, position: index + 1)
        end
      end

      def add_collection_to_linear_tree(entry)
        linear_tree_structure << entry
      end

      def save_linear_tree_structure!
        # result = nil
        # Collection.transaction do
        #   result = Collection.upsert_all(linear_tree_structure, returning: :id)
        # end

        linear_tree_structure.each do |entry|
          Collection.update(entry.delete(:id), entry)
        end
        true
      end

      def wrap_parent_ids(array_of_ids)
        return '/' if array_of_ids.blank?

        '/' + array_of_ids.join('/') + '/'
      end
    end
  end
end
