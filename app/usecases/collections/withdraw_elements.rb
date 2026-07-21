# frozen_string_literal: true

module Usecases
  module Collections
    # "Remove from all Collections": unlink the selection from every collection the acting user
    # personally owns (including their locked "All"), then destroy only the records left in no
    # collection at all.
    #
    # This replaces the previous record-level +destroy_all+, which — because destroying a record
    # drops it from *every* owner's collections — let one owner wipe a dual-owned element out of
    # another owner's private collections (see
    # analyses/add-sample-permission-behavior.md). Withdrawing is scoped to the actor's own
    # collections, so a shared/dual-owned element survives for its other owner; destruction only
    # happens as a consequence of sole ownership (the element was left nowhere else).
    class WithdrawElements
      # Join models whose unlink is association-aware — they refuse to drop an element still bound
      # to a reaction/wellplate/screen in the same collection (see D1 in the plan). The rest unlink
      # unconditionally.
      FILTERED_JOINS = [
        CollectionsSample,
        CollectionsWellplate,
        CollectionsSequenceBasedMacromoleculeSample,
      ].freeze

      attr_reader :current_user, :locked_sample_ids

      def initialize(current_user)
        @current_user = current_user
        @owned_collection_ids = []
        @locked_sample_ids = []
      end

      # @param source_collection [Collection] the collection the selection was made in; scopes the
      #   +by_ui_state+ resolution (a +checkedAll+ selection means "everything in this collection").
      # @param ui_state [Hash] the raw request params: one selection hash per element key, plus
      #   +:options+ (+:deleteSubsamples+).
      # @return [Hash{String=>Array<Integer>}] the ids that left the user's view (unlinked from all
      #   of their collections, whether or not the record was destroyed), keyed by the model
      #   +param_key+ — the shape the endpoint needs to close the matching detail tabs.
      def perform!(source_collection:, ui_state:, options: {})
        # The user's own collections, spanning the groups they belong to (a group member could
        # already destroy group-collection elements, so withdrawal keeps that reach). Restricting
        # group-owned withdrawal to group-admins is a deliberate future refinement, not done here.
        @owned_collection_ids = Collection.where(user_id: [current_user.id, *current_user.group_ids]).pluck(:id)
        @locked_sample_ids = []
        removed = Hash.new { |hash, key| hash[key] = [] }

        # As a side effect, #withdraw records into @locked_sample_ids any samples kept back by the
        # association guard (still bound to a reaction/wellplate in one of the user's collections).
        withdrawn_reaction_ids = withdraw_selected_elements(source_collection, ui_state, removed)
        removed['sample'] |= withdraw_reaction_subsamples(withdrawn_reaction_ids, options)
        withdraw_generic_elements(source_collection, ui_state, removed)
        removed
      end

      private

      # @return [Array<Integer>] ids of the reactions that left the user's view (for subsample handling)
      def withdraw_selected_elements(source_collection, ui_state, removed)
        reaction_ids = []
        API::ELEMENT_CLASS.each do |ui_key, klass|
          selection = ui_state[ui_key] || ui_state[ui_key.to_sym]
          next unless selected?(selection)

          ids = source_collection.send(klass.model_name.route_key).by_ui_state(selection).ids
          left_view = withdraw(klass, klass.collections_element_class, ids)
          removed[klass.model_name.param_key] = left_view
          reaction_ids = left_view if klass == Reaction
        end
        reaction_ids
      end

      # Mirror by_ui_state, which accepts both the current (checkedAll/checkedIds) and the legacy
      # (all/included_ids) selection shapes.
      def selected?(selection)
        return false if selection.blank?

        (selection[:checkedAll] || selection[:all]) ||
          (selection[:checkedIds] || selection[:included_ids]).present?
      end

      # Unlink +ids+ from every personally-owned collection, then destroy the records left orphaned.
      #
      # @return [Array<Integer>] ids that are no longer in any of the user's own collections. Ids
      #   kept by the association guard (still bound to a reaction/wellplate in one of the user's
      #   collections) are not included — they remain visible and are not destroyed.
      def withdraw(klass, join_table, ids)
        actionable = membership_ids(klass, ids, @owned_collection_ids)
        return [] if actionable.empty?

        if FILTERED_JOINS.include?(join_table)
          join_table.delete_in_collection_with_filter(actionable, @owned_collection_ids)
        else
          join_table.delete_in_collection(actionable, @owned_collection_ids)
        end
        join_table.update_tag_by_element_ids(actionable)

        # Two set-based membership queries instead of a per-element N+1. Both must run AFTER the
        # delete: delete_in_collection_with_filter may have kept some ids (still bound to a
        # reaction/wellplate in one of our collections), and that decision is only visible by asking
        # membership again — never derivable from `actionable`.
        still_ours = membership_ids(klass, actionable, @owned_collection_ids) # guard-kept ⇒ stay visible
        # guard-kept samples (bound to a reaction or wellplate here) cannot leave on their own;
        # surface them so the endpoint can tell the user why they were not removed
        @locked_sample_ids |= still_ours if klass == Sample
        left_view = actionable - still_ours
        orphaned = left_view - membership_ids(klass, left_view, nil) # in no collection ⇒ sole owner

        klass.where(id: orphaned).find_each(&:destroy) # per-record destroy keeps paranoia/callbacks
        left_view
      end

      # Ids among +ids+ whose element is still in at least one collection. Restricted to
      # +collection_ids+ when given; pass +nil+ for "any collection at all". The join goes through
      # the element's (non-deleted) collections association, so it only counts live memberships.
      def membership_ids(klass, ids, collection_ids)
        return [] if ids.blank?

        scope = klass.where(id: ids).joins(:collections)
        scope = scope.where(collections: { id: collection_ids }) if collection_ids
        scope.distinct.ids
      end

      # The withdrawn reactions' associated samples: solvents/reactants only unless the caller asked
      # to remove every subsample. Mirrors the pre-existing +deleteSubsamples+ contract.
      #
      # +with_deleted+ is load-bearing: withdraw_selected_elements has already destroyed the reactions,
      # and Reaction's +dependent: :destroy+ soft-deletes their (acts_as_paranoid) reactions_samples.
      # The default scope would hide exactly those rows, so their sample_ids must be read through the
      # unscoped relation — the reason the code this replaced used a raw inner join here.
      def withdraw_reaction_subsamples(reaction_ids, options)
        return [] if reaction_ids.blank?

        scope = ReactionsSample.with_deleted.where(reaction_id: reaction_ids)
        unless options[:deleteSubsamples] || options['deleteSubsamples']
          scope = scope.where(type: %w[ReactionsSolventSample ReactionsReactantSample])
        end
        withdraw(Sample, CollectionsSample, scope.pluck(:sample_id))
      end

      def withdraw_generic_elements(source_collection, ui_state, removed)
        Labimotion::ElementKlass.find_each do |klass|
          selection = ui_state[klass.name] || ui_state[klass.name.to_sym]
          next unless selected?(selection)

          ids = source_collection.elements.by_ui_state(selection).ids
          removed[klass.name] = withdraw(Labimotion::Element, Labimotion::CollectionsElement, ids)
        end
      end
    end
  end
end
