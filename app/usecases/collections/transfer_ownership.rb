# frozen_string_literal: true

module Usecases
  module Collections
    # Second step of "pass ownership": the recipient of a pending pass_ownership (level 5) offer
    # accepts it, transferring the collection — and its whole subtree — to them.
    #
    # The former owner is demoted to a manage_shares (4) sharee: they keep full access and share
    # administration but no longer own the collection. Elements move with the collection — each is
    # added to the new owner's "All", and removed from the old owner's "All" only when it is no
    # longer in any of the old owner's other collections (an element also in a private collection of
    # the old owner stays theirs, and becomes dual-owned).
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
          demote_former_owner(collection, old_owner)
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
        join_table.delete_in_collection(ids - still_theirs, @old_all.id)
      end

      def demote_former_owner(collection, old_owner)
        # Drop the consumed offer (and any other direct share to the new owner — they own it now).
        CollectionShare.where(collection: collection, shared_with_id: current_user.id).delete_all
        CollectionShare.create!(
          { collection: collection, shared_with: old_owner,
            permission_level: CollectionShare.permission_level(:manage_shares) }.merge(full_detail_levels),
        )
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
