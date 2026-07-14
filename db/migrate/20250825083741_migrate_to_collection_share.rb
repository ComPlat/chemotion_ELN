# frozen_string_literal: true

class MigrateToCollectionShare < ActiveRecord::Migration[6.1]
  # Label of the per-owner node the formerly shared-out collections are regrouped under.
  # The collection tree lost its "Shared by me" section in the collection-share refactor, so
  # without this the collections a user owned-and-shared-out would be scattered, undifferentiated,
  # inside "My Collections". Grouping them keeps them findable.
  SHARED_OUT_GROUP_LABEL = 'My projects with others'

  # SyncCollectionsUser was deleted, but the data migration still needs the model class, so we define it here
  # to be able to use its ActiveRecord interface
  if !defined?(SyncCollectionsUser)
      class SyncCollectionsUser < ApplicationRecord
        belongs_to :collection
      end
  end

  def up
    # First pass: collections that were "shared" (owner kept in shared_by_id, recipient in
    # user_id). Make shared_by_id the real owner and create a CollectionShare for the recipient.
    #
    # `.reorder(nil)` drops Collection's `default_scope { ordered }` (ORDER BY position) so
    # find_each does not warn "Scoped order is ignored, it's forced to be batch order"; we must
    # NOT use `.unscoped`, which would also drop acts_as_paranoid and pull in soft-deleted rows.
    shared_created = 0
    shared_skipped = 0
    # owner id => ids of that owner's formerly shared-out collections. Captured here, before
    # shared_by_id is nulled below (which is the only marker of "was shared out"), and regrouped
    # after the pass under a single per-owner "My projects with others" node.
    shared_out_by_owner = Hash.new { |hash, key| hash[key] = [] }
    Collection.where.not(shared_by_id: nil).reorder(nil).find_each do |collection|
      owner_id = collection.shared_by_id
      if User.exists?(id: collection.user_id)
        CollectionShare.create(
          collection: collection,
          shared_with_id: collection.user_id,
          permission_level: collection.permission_level,
          celllinesample_detail_level: collection.celllinesample_detail_level || 10,
          devicedescription_detail_level: collection.devicedescription_detail_level || 10,
          element_detail_level: collection.element_detail_level || 10,
          reaction_detail_level: collection.reaction_detail_level || 10,
          researchplan_detail_level: collection.researchplan_detail_level || 10,
          sample_detail_level: collection.sample_detail_level || 10,
          screen_detail_level: collection.screen_detail_level || 10,
          sequencebasedmacromoleculesample_detail_level: collection.try(:sequencebasedmacromoleculesample_detail_level) || 10,
          wellplate_detail_level: collection.wellplate_detail_level || 10
        )
        shared_created += 1
      else
        # Recipient is missing or soft-deleted: belongs_to :shared_with is required and
        # resolves User through its paranoid scope, so create would fail validation silently.
        # Skip the share explicitly, but still transfer ownership to shared_by_id below.
        say "skipping share for collection ##{collection.id}: recipient user ##{collection.user_id} is missing or soft-deleted"
        shared_skipped += 1
      end
      # Transfer ownership to the real owner. The `shared` flag is set authoritatively at the
      # end (it mirrors "has at least one CollectionShare"), not per row.
      collection.update(user_id: owner_id, shared_by_id: nil)
      shared_out_by_owner[owner_id] << collection.id if owner_id
    end
    say "shared pass: created #{shared_created} shares, skipped #{shared_skipped} (deleted recipient)"

    regroup_shared_out_collections(shared_out_by_owner)

    # Second pass: synchronized collections (SyncCollectionsUser join rows).
    sync_created = 0
    sync_orphan = 0
    sync_deleted_recipient = 0
    SyncCollectionsUser.find_each do |scu|
      collection = scu.collection
      # Orphaned sync rows exist in real prod data: collection_id can be NULL, point to a
      # missing collection, or reference a soft-deleted one (acts_as_paranoid hides it, so the
      # association returns nil). Without this guard the CollectionShare insert hits the
      # collection_id FK (ActiveRecord::InvalidForeignKey) or collection.update raises
      # NoMethodError on nil, aborting the whole migration.
      if collection.nil?
        say "skipping orphan SyncCollectionsUser ##{scu.id} (collection_id=#{scu.collection_id.inspect})"
        sync_orphan += 1
        next
      end

      # Same paranoid-recipient case as the first pass: skip explicitly instead of letting
      # the required belongs_to :shared_with validation drop the row silently.
      unless User.exists?(id: scu.user_id)
        say "skipping sync share ##{scu.id}: recipient user ##{scu.user_id} is missing or soft-deleted"
        sync_deleted_recipient += 1
        next
      end

      CollectionShare.create(
        collection_id: collection.id,
        shared_with_id: scu.user_id,
        permission_level: scu.permission_level,
        celllinesample_detail_level: scu.celllinesample_detail_level || 10,
        devicedescription_detail_level: scu.devicedescription_detail_level || 10,
        element_detail_level: scu.element_detail_level || 10,
        reaction_detail_level: scu.reaction_detail_level || 10,
        researchplan_detail_level: scu.researchplan_detail_level || 10,
        sample_detail_level: scu.sample_detail_level || 10,
        screen_detail_level: scu.screen_detail_level || 10,
        sequencebasedmacromoleculesample_detail_level: scu.try(:sequencebasedmacromoleculesample_detail_level) || 10,
        wellplate_detail_level: scu.wellplate_detail_level || 10
      )
      sync_created += 1
    end
    say "sync pass: created #{sync_created} shares, skipped #{sync_orphan} orphan + #{sync_deleted_recipient} (deleted recipient)"

    # collections.shared mirrors "has at least one CollectionShare". CollectionShareAPI flips it
    # on create and off when the last share is removed; initialise it the same way in one pass so
    # collections whose only recipient was missing/soft-deleted are correctly left unshared.
    execute(
      'UPDATE collections SET shared = ' \
      'EXISTS (SELECT 1 FROM collection_shares cs WHERE cs.collection_id = collections.id)'
    )
  end

  # Re-parent each owner's formerly shared-out collections under a single, unlocked, top-level
  # "My projects with others" node, positioned last among that owner's roots, so they stay
  # findable now that the tree's "Shared by me" section is gone. The grouping node is owned by
  # the owner and never shared; recipients still see the child collections via their
  # CollectionShare (ancestry-independent), so their "Shared with me" view is unchanged.
  #
  # @param shared_out_by_owner [Hash{Integer => Array<Integer>}] owner id => shared-out collection ids
  def regroup_shared_out_collections(shared_out_by_owner)
    regrouped = 0
    shared_out_by_owner.each do |owner_id, collection_ids|
      next unless User.exists?(id: owner_id)

      regrouped += reparent_under_group(collection_ids, shared_out_group_for(owner_id))
    end
    say "regrouped #{regrouped} shared-out collections under '#{SHARED_OUT_GROUP_LABEL}'"
  end

  # Idempotent per-owner grouping node. `ancestry: '/'` is a root in the materialized_path2
  # format; it is positioned after the owner's existing roots so it sorts last.
  def shared_out_group_for(owner_id)
    Collection.find_or_create_by!(user_id: owner_id, label: SHARED_OUT_GROUP_LABEL, is_locked: false) do |node|
      node.ancestry = '/'
      node.position = (Collection.where(user_id: owner_id, ancestry: '/').maximum(:position) || 0) + 1
    end
  end

  # @return [Integer] number of collections actually moved under +group+
  def reparent_under_group(collection_ids, group)
    moved = 0
    Collection.where(id: collection_ids).where.not(id: group.id).reorder(nil).find_each do |collection|
      next if collection.parent_id == group.id # already grouped

      # parent= updates ancestry and cascades to descendants (orphan_strategy: :adopt),
      # preserving any sub-collection subtree the shared-out collection carried.
      collection.parent = group
      collection.save!
      moved += 1
    end
    moved
  end
end
