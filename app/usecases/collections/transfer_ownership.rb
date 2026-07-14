# frozen_string_literal: true

module Usecases
  module Collections
    # Second step of "pass ownership": the recipient of a pending pass_ownership (level 5) offer
    # accepts it, transferring the collection — and its whole subtree — to them.
    #
    # Ownership of the whole subtree moves to the new owner. Shares are switched only where a
    # matching share to the new owner already existed: the offered root (which holds the accepted
    # offer) and any sub-collection that was itself shared to the new owner have that share dropped
    # (the new owner owns it now) and gain a manage_shares (4) share for the former owner, so the
    # former owner keeps access there. Sub-collections that were not shared to the new owner
    # transfer ownership without leaving the former owner a share. Elements move with the collection
    # — each is added to the new owner's "All", and removed from the old owner's "All" only when it
    # is no longer in any of the old owner's other collections (an element also in a private
    # collection of the old owner stays theirs, and becomes dual-owned).
    class TransferOwnership
      FULL_DETAIL_LEVEL = 10 # every *_detail_level column at max — the demotee was the owner

      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
      end

      # @param collection [Collection] the offered collection (transfers with its subtree)
      # @raise [Usecases::Collections::Errors::InsufficientPermissionError] when the caller holds no
      #   pass_ownership offer, or the caller/collection is ineligible
      # @return [Collection] the collection, reloaded under its new owner
      def perform!(collection:)
        validate!(collection)
        old_owner = collection.user

        ActiveRecord::Base.transaction do
          subtree_ids = collection.subtree.pluck(:id)
          reassign_subtree(collection, subtree_ids)
          move_elements(subtree_ids, old_owner)
          demote_former_owner(subtree_ids, old_owner)
          collection.update!(shared: CollectionShare.exists?(collection: collection))
        end

        notify(collection, old_owner)
        collection.reload
      end

      private

      def validate!(collection)
        raise Errors::InsufficientPermissionError, 'Only a person can take ownership' unless current_user.is_a?(Person)
        raise Errors::InsufficientPermissionError, 'This collection cannot change ownership' if collection.is_locked
        return if held_offer(collection).exists?

        raise Errors::InsufficientPermissionError, 'You have not been offered ownership of this collection'
      end

      # The pending offer: a direct pass_ownership share addressed to the accepting user.
      def held_offer(collection)
        CollectionShare
          .shared_directly_with(current_user)
          .where(collection: collection, permission_level: CollectionShare.permission_level(:pass_ownership))
      end

      # Re-root the offered collection to the new owner's top level (has_ancestry rewrites the
      # descendants' ancestry), then hand the whole subtree to the new owner.
      def reassign_subtree(collection, subtree_ids)
        collection.update!(parent: nil) unless collection.root?
        Collection.where(id: subtree_ids).update_all(user_id: current_user.id) # rubocop:disable Rails/SkipsModelValidations
      end

      def move_elements(subtree_ids, old_owner)
        @old_all = Collection.get_all_collection_for_user(old_owner.id)
        @new_all = Collection.get_all_collection_for_user(current_user.id)
        # Collections the old owner still owns after the transfer (the subtree is the new owner's now).
        @other_old_ids = Collection.where(user_id: old_owner.id).where.not(id: @old_all&.id).pluck(:id)

        element_join_tables.each do |klass, join_table|
          move_element_class(klass, join_table, subtree_ids)
        end
      end

      def move_element_class(klass, join_table, subtree_ids)
        ids = klass.joins(:collections).where(collections: { id: subtree_ids }).distinct.ids
        return if ids.empty?

        join_table.create_in_collection(ids, @new_all.id) if @new_all
        return unless @old_all

        still_theirs = klass.where(id: ids).joins(:collections).where(collections: { id: @other_old_ids }).distinct.ids
        detach_from_old_all(join_table, ids - still_theirs)
      end

      # Unlink from the old owner's "All", honouring the same association guard WithdrawElements
      # applies: a sample/wellplate still bound to a reaction/wellplate/screen kept in that "All"
      # is not detached (WithdrawElements::FILTERED_JOINS is the single source of truth for which
      # join tables carry that guard). All other join tables detach unconditionally.
      def detach_from_old_all(join_table, ids)
        return if ids.empty?

        if WithdrawElements::FILTERED_JOINS.include?(join_table)
          join_table.delete_in_collection_with_filter(ids, @old_all.id)
        else
          join_table.delete_in_collection(ids, @old_all.id)
        end
      end

      # Switch owner/sharee across the transferred subtree, but only where a matching share to the
      # new owner already existed. The offered root always qualifies (it holds the accepted offer);
      # a sub-collection qualifies only if it was itself shared to the new owner. For each such
      # collection: drop the new owner's now-redundant direct share(s) — they own it now — and grant
      # the former owner a manage_shares sharee so they keep access there. Sub-collections that were
      # never shared to the new owner transfer ownership without leaving the former owner a share.
      def demote_former_owner(subtree_ids, old_owner)
        # The subtree collections that were shared to the new owner — exactly the ones whose share
        # switches to the former owner. Resolved in one query instead of a per-collection exists?.
        switch_ids = CollectionShare.where(collection_id: subtree_ids, shared_with_id: current_user.id)
                                    .distinct.pluck(:collection_id)
        return if switch_ids.empty?

        # Drop the new owner's now-redundant shares (they own these now), then grant the former owner
        # a manage_shares sharee on each — both set-based across the whole subtree.
        CollectionShare.where(collection_id: switch_ids, shared_with_id: current_user.id).delete_all
        grant_manage_shares(switch_ids, old_owner)
      end

      # Grant the former owner a manage_shares sharee on each of +collection_ids+ in one statement.
      # upsert_all bypasses callbacks (CollectionShare has none) so created_at/updated_at are set
      # explicitly; unique_by resurrects any pre-existing (collection_id, shared_with_id) row rather
      # than colliding (in practice all inserts — the old owner held no share on their own collection).
      def grant_manage_shares(collection_ids, old_owner)
        now = Time.current
        rows = collection_ids.map do |collection_id|
          { collection_id: collection_id, shared_with_id: old_owner.id,
            permission_level: CollectionShare.permission_level(:manage_shares),
            created_at: now, updated_at: now, **full_detail_levels }
        end
        CollectionShare.upsert_all(rows, unique_by: %i[collection_id shared_with_id]) # rubocop:disable Rails/SkipsModelValidations
      end

      def notify(collection, old_owner)
        Message.create_msg_notification(
          channel_subject: Channel::COLLECTION_TAKE_OWNERSHIP,
          message_from: current_user.id,
          message_to: [old_owner.id],
          data_args: { new_owner: current_user.name, collection_name: collection.label },
          level: 'info',
        )
      rescue StandardError => e
        Rails.logger.warn("TransferOwnership notification failed: #{e.message}")
      end

      # { ModelClass => join model } for every element type plus Labimotion generics.
      def element_join_tables
        tables = API::ELEMENT_CLASS.values.index_with(&:collections_element_class)
        tables[Labimotion::Element] = Labimotion::CollectionsElement
        tables
      end

      def full_detail_levels
        Collection::DETAIL_LEVEL_KEYS.reject { |key| key == :permission_level }.index_with { FULL_DETAIL_LEVEL }
      end
    end
  end
end
