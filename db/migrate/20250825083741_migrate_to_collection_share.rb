class MigrateToCollectionShare < ActiveRecord::Migration[6.1]
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
    Collection.where.not(shared_by_id: nil).reorder(nil).find_each do |collection|
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
      collection.update(user_id: collection.shared_by_id, shared_by_id: nil)
    end
    say "shared pass: created #{shared_created} shares, skipped #{shared_skipped} (deleted recipient)"

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
end
