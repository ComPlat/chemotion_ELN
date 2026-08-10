# frozen_string_literal: true

class MigrateToCollectionShare < ActiveRecord::Migration[6.1]
  # Label of the per-owner node the formerly shared-out collections are regrouped under.
  # The collection tree lost its "Shared by me" section in the collection-share refactor, so
  # without this the collections a user owned-and-shared-out would be scattered, undifferentiated,
  # inside "My Collections". Grouping them keeps them findable.
  #
  # The node is deliberately NOT locked: it is a helper container, and reorganising, renaming or
  # dissolving it afterwards is the user's business.
  SHARED_OUT_GROUP_LABEL = 'My projects with others'

  # Element membership tables, frozen here rather than derived from Collection's associations: a
  # migration must keep reading the schema it was written against, whatever the model does later.
  ELEMENT_JOIN_TABLES = %w[
    collections_samples
    collections_reactions
    collections_wellplates
    collections_screens
    collections_research_plans
    collections_device_descriptions
    collections_elements
    collections_vessels
    collections_celllines
    collections_sequence_based_macromolecule_samples
  ].freeze

  # SyncCollectionsUser was deleted, but the data migration still needs the model class, so we define it here
  # to be able to use its ActiveRecord interface
  if !defined?(SyncCollectionsUser)
      class SyncCollectionsUser < ApplicationRecord
        belongs_to :collection
      end
  end

  def up
    regroup_shared_out_collections(migrate_direct_shares)
    reroot_residual_wrapper_children
    salvage_wrappers_holding_elements
    retire_share_wrappers
    migrate_sync_shares
    refresh_shared_flag
    report_dangling_ancestry
  end

  # No +down+. +deleted_at+ alone does not distinguish a wrapper this migration retired from one a
  # user deleted years ago, so the retirement is not selectively reversible.

  # First pass: collections that were "shared" (owner kept in shared_by_id, recipient in
  # user_id). Make shared_by_id the real owner and create a CollectionShare for the recipient.
  #
  # +.reorder(nil)+ drops Collection's +default_scope { ordered }+ (ORDER BY position) so
  # find_each does not warn "Scoped order is ignored, it's forced to be batch order"; we must
  # NOT use +.unscoped+, which would also drop acts_as_paranoid and pull in soft-deleted rows.
  #
  # @return [Hash{Integer => Array<Integer>}] owner id => ids of that owner's shared-out collections
  def migrate_direct_shares
    created = 0
    failed = 0
    skipped = 0
    shared_out_by_owner = Hash.new { |hash, key| hash[key] = [] }

    Collection.where.not(shared_by_id: nil).reorder(nil).find_each do |collection|
      next if share_wrapper?(collection)

      owner_id = collection.shared_by_id
      if collection.user_id == owner_id
        # Degenerate legacy row: sharing with yourself. Re-own it (below) but write no share.
        say "collection ##{collection.id}: shared_by_id equals user_id, no share created"
      else
        case create_collection_share(collection, collection.user_id, collection.permission_level)
        when :created then created += 1
        when :failed then failed += 1
        when :missing
          say "skipping share for collection ##{collection.id}: recipient user ##{collection.user_id} is missing or soft-deleted"
          skipped += 1
        end
      end

      # Transfer ownership to the real owner. The `shared` flag is set authoritatively at the end
      # (it mirrors "has at least one CollectionShare"), not per row. A locked row that is not a
      # wrapper cannot be re-owned through the model — LockedCollectionGuard rejects it — but it
      # still has to stop carrying shared_by_id into a schema that no longer has the column.
      if collection.is_locked?
        say "collection ##{collection.id} is locked but not a share wrapper: re-owned in place, not regrouped"
        collection.update_columns(user_id: owner_id, shared_by_id: nil, updated_at: Time.current)
      elsif collection.update(user_id: owner_id, shared_by_id: nil)
        shared_out_by_owner[owner_id] << collection.id if owner_id
      else
        # Left out of the regroup deliberately: the row still belongs to the recipient, so moving it
        # into the owner's tree would be wrong, and queueing it would make the regroup's save! raise.
        say "could not transfer ownership of collection ##{collection.id}: #{collection.errors.full_messages.join(', ')}"
        failed += 1
      end
    end

    say "shared pass: created #{created} shares, #{failed} failed, " \
        "skipped #{skipped} (deleted recipient)"
    shared_out_by_owner
  end

  # Second pass: synchronized collections (SyncCollectionsUser join rows). A synchronized collection
  # was never re-owned or re-parented pre-refactor, and is not here either.
  def migrate_sync_shares
    created = 0
    failed = 0
    orphan = 0
    skipped = 0
    SyncCollectionsUser.find_each do |scu|
      # Orphaned sync rows exist in real prod data: collection_id can be NULL, point to a
      # missing collection, or reference a soft-deleted one. Without this guard the CollectionShare
      # insert hits the collection_id FK (ActiveRecord::InvalidForeignKey), aborting the migration.
      collection = scu.collection
      if collection.nil?
        say "skipping orphan SyncCollectionsUser ##{scu.id} (collection_id=#{scu.collection_id.inspect})"
        orphan += 1
        next
      end

      case create_collection_share(collection, scu.user_id, scu.permission_level, scu)
      when :created then created += 1
      when :failed then failed += 1
      when :missing
        say "skipping sync share ##{scu.id}: recipient user ##{scu.user_id} is missing or soft-deleted"
        skipped += 1
      end
    end
    say "sync pass: created #{created} shares, #{failed} failed, " \
        "skipped #{orphan} orphan + #{skipped} (deleted recipient)"
  end

  # collections.shared mirrors "has at least one CollectionShare". CollectionShareAPI flips it
  # on create and off when the last share is removed; initialise it the same way in one pass so
  # collections whose only recipient was missing are correctly left unshared.
  def refresh_shared_flag
    execute(<<~SQL.squish)
      UPDATE collections SET shared = EXISTS (
        SELECT 1 FROM collection_shares cs WHERE cs.collection_id = collections.id
      )
      WHERE shared IS DISTINCT FROM EXISTS (
        SELECT 1 FROM collection_shares cs WHERE cs.collection_id = collections.id
      )
    SQL
  end

  # Pre-#2783 data carries synthetic locked wrapper collections alongside the real shared ones:
  # Usecases::Sharing::{ShareWithUser,SyncWithUser,TakeOwnership} created them as
  # +is_locked: true, is_shared: true, label: format('with %s', <recipient abbrev>)+ purely to group
  # a user's shared-in collections under one tree node. All three attributes are checked: +is_locked+
  # alone also matches the per-user "All", "chemotion-repository.net" and "transferred" roots, and a
  # row misidentified here loses its shared_by_id and is then retired.
  #
  # @return [Boolean] whether +collection+ is a legacy share wrapper
  def share_wrapper?(collection)
    collection.is_locked? && collection.is_shared? && collection.label.to_s.start_with?('with ')
  end

  # @return [ActiveRecord::Relation] the wrappers, which pass 1 leaves carrying their shared_by_id
  def share_wrappers
    Collection.where(is_locked: true).where.not(shared_by_id: nil)
  end

  # Writes one CollectionShare.
  #
  # +permission_level+ is coalesced like the detail levels: both legacy sources are nullable, and
  # collection_shares.permission_level is NOT NULL, so passing a legacy NULL through would abort the
  # run on a database constraint rather than skip one row.
  #
  # @param source [#celllinesample_detail_level, nil] row carrying the detail levels; the collection itself when nil
  # @return [Symbol] +:created+, +:missing+ when the recipient is missing or soft-deleted, or
  #   +:failed+ when the row was rejected
  def create_collection_share(collection, recipient_id, permission_level, source = nil)
    return :missing unless User.exists?(id: recipient_id)

    source ||= collection
    share = CollectionShare.new(shared_with_id: recipient_id, permission_level: permission_level || 0)
    share.collection = collection
    %i[
      celllinesample_detail_level devicedescription_detail_level element_detail_level
      reaction_detail_level researchplan_detail_level sample_detail_level screen_detail_level
      sequencebasedmacromoleculesample_detail_level wellplate_detail_level
    ].each { |level| share.public_send("#{level}=", source.try(level) || 10) }
    return :created if share.save

    say "could not share collection ##{collection.id} with user ##{recipient_id}: #{share.errors.full_messages.join(', ')}"
    :failed
  end

  # Re-parents each owner's formerly shared-out collections under a single unlocked "My projects
  # with others" node, so they stay findable now that the tree's "Shared by me" section is gone.
  # Recipients still reach the collections through their CollectionShare, which is
  # ancestry-independent, so their "Shared with me" view is unaffected.
  #
  # @param shared_out_by_owner [Hash{Integer => Array<Integer>}] owner id => shared-out collection ids
  def regroup_shared_out_collections(shared_out_by_owner)
    regrouped = 0
    owners = 0
    shared_out_by_owner.each do |owner_id, collection_ids|
      next unless User.exists?(id: owner_id)

      owners += 1
      group = shared_out_group_for(owner_id)
      Collection.where(id: collection_ids).where.not(id: group.id).reorder(nil).find_each do |collection|
        next if collection.parent_id == group.id

        # parent= updates ancestry and cascades to descendants (orphan_strategy: :adopt),
        # preserving any sub-collection subtree the shared-out collection carried.
        collection.parent = group
        collection.save!
        regrouped += 1
      end
    end
    say "regrouped #{regrouped} shared-out collection(s) under '#{SHARED_OUT_GROUP_LABEL}' " \
        "for #{owners} owner(s)"
  end

  # Idempotent per-owner grouping node. Only live nodes are matched: a soft-deleted one is a node the
  # user deleted, and resurrecting it silently would be worse than creating a fresh one. +ancestry+ is
  # not part of the lookup — the node is user-movable, so pinning it to the root would mint a second
  # one on a re-run after a legitimate move.
  def shared_out_group_for(owner_id)
    Collection.find_or_create_by!(user_id: owner_id, label: SHARED_OUT_GROUP_LABEL, is_locked: false) do |node|
      node.ancestry = '/'
      node.position = (Collection.where(user_id: owner_id, ancestry: '/').maximum(:position) || 0) + 1
    end
  end

  # Anything still sitting under a wrapper once the shared-out collections have been regrouped never
  # belonged to the sharing machinery — legacy TakeOwnership nested the odd ordinary collection there.
  # It goes back to the wrapper's own level rather than into the grouping node: it carries no share,
  # so filing it under "My projects with others" would make that node lie about its contents.
  #
  # Written through the model so the ancestry change cascades to any subtree the stray carried. This
  # is what lets every wrapper be retired: nothing has to be kept alive to host an orphan.
  def reroot_residual_wrapper_children
    rerooted = 0
    # Re-read each wrapper: re-rooting a nested wrapper moves its own descendants, so an instance
    # loaded in an earlier batch would report a child_ancestry that no longer matches any row.
    share_wrappers.reorder(nil).pluck(:id).each do |wrapper_id|
      wrapper = Collection.find(wrapper_id)
      Collection.where(ancestry: wrapper.child_ancestry).reorder(nil).find_each do |stray|
        say "re-rooting collection ##{stray.id} (user ##{stray.user_id}) out of share wrapper ##{wrapper.id}"
        stray.parent = wrapper.parent
        stray.save!
        rerooted += 1
      end
    end
    say "re-rooted #{rerooted} collection(s) that were left under a share wrapper"
  end

  # A wrapper that holds element links directly is not a container: someone added elements to it
  # (AddElements resolves collections through own_collections_for with no is_locked check, so this is
  # a supported action). Retiring it would strand those links on a soft-deleted collection, and moving
  # them into the grouping node would hand the sharer access to elements belonging to the wrapper's
  # holder. It is therefore unlocked and left exactly where it is, with its owner and its membership.
  #
  # SQL because is_locked is in LockedCollectionGuard's LOCKED_IMMUTABLE_ATTRIBUTES and the validation
  # keys off the persisted flag, so a model-level unlock fails.
  def salvage_wrappers_holding_elements
    holders = ELEMENT_JOIN_TABLES.map do |table|
      "EXISTS (SELECT 1 FROM #{table} j WHERE j.collection_id = c.id AND j.deleted_at IS NULL)"
    end.join(' OR ')

    salvaged = execute(<<~SQL.squish)
      UPDATE collections c SET is_locked = false, shared_by_id = NULL, updated_at = now()
      WHERE c.is_locked AND c.shared_by_id IS NOT NULL AND (#{holders})
    SQL
    say "salvaged #{salvaged.cmd_tuples} share wrapper(s) holding elements: unlocked, left with their owner"
  end

  # Retires the emptied wrappers. Their only job was grouping a user's shared-in collections under one
  # tree node, which the per-owner grouping node now does.
  #
  # Must run after the regroup, the re-root and the salvage: those three are what empty a wrapper, and
  # retiring one that still has a child would leave that child's ancestry pointing at a deleted row.
  #
  # Writing the columns directly is what paranoia's #delete does, and both of them: #delete merges
  # timestamp_attributes_with_current_time, so a soft delete that leaves updated_at stale is invisible
  # to anything keyed on it (incremental sync/export, cache keys). destroy is not an option —
  # LockedCollectionGuard's before_destroy aborts it — and relation #delete_all is not overridden by
  # paranoia and would issue a raw hard DELETE.
  def retire_share_wrappers
    retired = execute(<<~SQL.squish)
      UPDATE collections SET deleted_at = now(), updated_at = now(), shared_by_id = NULL
      WHERE is_locked AND shared_by_id IS NOT NULL AND deleted_at IS NULL
    SQL
    say "retired #{retired.cmd_tuples} legacy share wrapper(s) as a recoverable soft delete"
  end

  # Post-condition, logged rather than raised: no live collection should be left pointing at a parent
  # that is missing or soft-deleted. Reporting it makes the run's own output the evidence that the
  # tree came out intact, instead of a comment claiming it did.
  def report_dangling_ancestry
    # +substring(text from pattern)+ rather than a negative +split_part+ index, which needs PG 14,
    # and the pattern doubles as the guard: a row whose ancestry has no trailing id yields NULL and
    # is not cast. Wrapped as well, because a diagnostic must never be able to fail the migration it
    # is reporting on.
    dangling = select_value(<<~SQL.squish).to_i
      SELECT count(*) FROM collections c
      WHERE c.deleted_at IS NULL AND substring(c.ancestry from '([0-9]+)/$') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM collections p
          WHERE p.id = substring(c.ancestry from '([0-9]+)/$')::bigint AND p.deleted_at IS NULL
        )
    SQL
    return say('tree check: no live collection has a missing or deleted parent') if dangling.zero?

    say "tree check: WARNING #{dangling} live collection(s) point at a missing or deleted parent"
  rescue StandardError => e
    say "tree check: could not be run (#{e.class}: #{e.message})"
  end
end
