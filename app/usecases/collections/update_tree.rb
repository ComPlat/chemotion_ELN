# frozen_string_literal: true

# rubocop:disable Rails/SkipsModelValidations
module Usecases
  module Collections
    class UpdateTree
      attr_reader :current_user, :linear_tree_structure

      def initialize(current_user)
        @current_user = current_user
        @linear_tree_structure = []
      end

      def perform!(collections:)
        collections.each.with_index do |collection, index|
          add_collection_and_children_to_linear_tree(collection, position: index + 1)
        end

        changed_shared_with_ids_groups = changed_shared_collection_recipients

        save_linear_tree_structure!
        notify_changed_sharees!(changed_shared_with_ids_groups)
      end

      private

      # shared_with_ids for every collection whose label, ancestry, or position actually changes —
      # a rename, a reparent, or a reorder each change what a sharee's tree shows — and which is
      # shared with someone. Computed against the values currently in the DB, and before the write:
      # save_linear_tree_structure! goes through upsert_all, which skips AR callbacks/dirty-tracking,
      # so there is no "did this change" signal available afterwards. A reparent cascades correctly
      # to every descendant with no special-casing needed: this method re-flattens the whole
      # submitted tree every save, so a descendant's own ancestry string changes automatically
      # whenever any ancestor's position in the hierarchy changes, even an ancestor not shared with
      # this sharee.
      def changed_shared_collection_recipients
        changed_ids = changed_collection_ids
        return [] if changed_ids.empty?

        shared_with_ids_by_collection = CollectionShare.where(collection_id: changed_ids)
                                                       .group_by(&:collection_id)
                                                       .transform_values { |shares| shares.map(&:shared_with_id) }

        changed_ids.filter_map { |id| shared_with_ids_by_collection[id].presence }
      end

      def new_state_by_id_from_tree
        linear_tree_structure.select { |entry| entry[:label] }
                             .to_h { |entry| [entry[:id], entry.values_at(:label, :ancestry, :position)] }
      end

      def changed_collection_ids
        new_state_by_id = new_state_by_id_from_tree
        return [] if new_state_by_id.empty?

        current_state_by_id = Collection.where(id: new_state_by_id.keys)
                                        .pluck(:id, :label, :ancestry, :position)
                                        .to_h { |id, *state| [id, state] }
        new_state_by_id.reject { |id, state| current_state_by_id[id] == state }.keys
      end

      def notify_changed_sharees!(shared_with_ids_groups)
        notifier = CollectionShareNotifier.new(current_user)
        shared_with_ids_groups.each do |shared_with_ids|
          notifier.notify!(shared_with_ids, "#{current_user.name} made changes to a collection shared with you.",
                           silent: true)
        end
      end

      # Locked collections (the "All"/repository/transferred roots) are excluded: their label and
      # tree position are system-defined, so a bulk tree update may neither move nor rename them.
      # The frontend already omits them from the payload; a request that includes one anyway is
      # rejected wholesale via {#add_collection_and_children_to_linear_tree}.
      #
      # Everything *inside* a locked collection is excluded for the same reason: a tree payload
      # places a collection by nesting, so accepting one would let a save lift it out of the locked
      # container it was put in. That is how the repository root's "transferred" child escaped to
      # the top level. The whole subtree is excluded, not just the direct children — a grandchild
      # listed at the top level of a payload would escape exactly the same way.
      #
      # Returns a Set: this is checked once per node of the submitted tree.
      def collections_permitted_to_update
        @collections_permitted_to_update ||=
          (Collection.own_collections_for(current_user).unlocked.ids - collections_inside_locked_containers).to_set
      end

      # Descendants of the user's locked collections, at any depth. +child_ancestry+ is the ancestry
      # value this collection's children carry, so every descendant's ancestry starts with it.
      #
      # @return [Array<Integer>] ids of the collections nested inside a locked collection
      def collections_inside_locked_containers
        prefixes = Collection.own_collections_for(current_user).locked.map(&:child_ancestry)
        return [] if prefixes.empty?

        Collection.own_collections_for(current_user)
                  .where(prefixes.map { 'collections.ancestry LIKE ?' }.join(' OR '),
                         *prefixes.map { |prefix| "#{prefix}%" })
                  .ids
      end

      def add_collection_and_children_to_linear_tree(collection, position:, parent_ids: [])
        collection_id = collection[:id].to_i
        raise Errors::UpdateForbidden, 'Update forbidden' unless collection_id.in?(collections_permitted_to_update)

        ancestry = wrap_parent_ids(parent_ids)
        entry = {
          id: collection_id,
          label: collection[:label],
          position: position,
          ancestry: ancestry,
          user_id: current_user.id,
        }

        add_collection_to_linear_tree(entry)

        (collection[:children] || []).each_with_index do |child_collection, index|
          # IMPORTANT: this must return a new Array, otherwise the recursion breaks the parent structure
          parent_ids_of_child = parent_ids + [collection_id]

          add_collection_and_children_to_linear_tree(
            child_collection,
            parent_ids: parent_ids_of_child,
            position: index + 1,
          )
        end
      end

      def add_collection_to_linear_tree(entry)
        linear_tree_structure << entry
      end

      def save_linear_tree_structure!
        if Rails::VERSION::MAJOR > 6
          Collection.transaction do
            Collection.upsert_all(linear_tree_structure, returning: :id)
          end
        else
          linear_tree_structure.each do |entry|
            Collection.update(entry.delete(:id), entry)
          end
        end
      end

      def wrap_parent_ids(array_of_ids)
        return '/' if array_of_ids.blank?

        "/#{array_of_ids.join('/')}/"
      end
    end
  end
end
# rubocop:enable Rails/SkipsModelValidations
