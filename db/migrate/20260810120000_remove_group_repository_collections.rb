# frozen_string_literal: true

class RemoveGroupRepositoryCollections < ActiveRecord::Migration[6.1]
  # A "chemotion-repository.net" collection belongs to a person, not to a group account.
  # User#create_chemotion_public_collection has returned early unless the user is a +Person+ for
  # years, so no new one can appear; what is left are legacy rows from before that guard.
  #
  # They are not merely redundant. +Collection.own_collections_for+ resolves a user's collections as
  # `user_id IN (self, *group_ids)`, so a member of such a group receives several collections
  # labelled "chemotion-repository.net" in one payload, and the collection store keeps a single
  # +chemotion_repository_collection+. The group-owned row could take that field over, and the
  # member's own repository subtree — the "transferred" collection a gate transfer fills — was then
  # routed into their ordinary collections, shown at the top level, and re-rooted by the next tree
  # save.
  #
  # Soft-deleted rather than destroyed: +Collection+ is +acts_as_paranoid+, so writing +deleted_at+
  # is what +#delete+ does, the row stays recoverable through +Collection.only_deleted+, and no
  # callback runs (+LockedCollectionGuard+ aborts +destroy+ on a locked collection).
  #
  # Only rows that hold nothing are touched — no child collections and no elements — so a group row
  # that unexpectedly has content is reported and left for a human rather than taking it out of
  # reach. +is_locked+ is required as well: the label is not reserved, and an ordinary collection a
  # user made or a collection archive recreated under that name is not this migration's business.

  REPOSITORY_LABEL = 'chemotion-repository.net'

  # Every join table an element can sit in; mirrors
  # 20260713120000_backfill_missing_all_collection_memberships.
  ELEMENT_JOIN_TABLES = %w[
    collections_samples
    collections_reactions
    collections_wellplates
    collections_screens
    collections_research_plans
    collections_celllines
    collections_device_descriptions
    collections_sequence_based_macromolecule_samples
    collections_elements
    collections_vessels
  ].freeze

  def up
    kept = select_values(<<~SQL.squish)
      SELECT c.id FROM collections c
      JOIN users u ON u.id = c.user_id AND u.type = 'Group'
      WHERE c.label = '#{REPOSITORY_LABEL}'
        AND c.is_locked
        AND c.deleted_at IS NULL
        AND NOT (#{empty_predicate})
    SQL
    kept.each { |id| say "keeping group repository collection ##{id}: it still holds content" }

    say_with_time 'soft-deleting the empty repository collections of group accounts' do
      execute(<<~SQL.squish)
        UPDATE collections c
        SET deleted_at = NOW()
        FROM users u
        WHERE u.id = c.user_id
          AND u.type = 'Group'
          AND c.label = '#{REPOSITORY_LABEL}'
          AND c.is_locked
          AND c.deleted_at IS NULL
          AND #{empty_predicate};
      SQL
    end
  end

  def down
    # Raised rather than logged: a `down` that returns normally reports success and drops the
    # schema_migrations row while the data change stays applied.
    raise ActiveRecord::IrreversibleMigration,
          'RemoveGroupRepositoryCollections is not reversible (its soft deletes are indistinguishable).'
  end

  private

  # True for a collection that holds neither sub-collections nor elements.
  def empty_predicate
    <<~SQL.squish
      NOT EXISTS (
        SELECT 1 FROM collections k WHERE k.ancestry = '/' || c.id || '/' AND k.deleted_at IS NULL
      )
      #{ELEMENT_JOIN_TABLES.map do |table|
        "AND NOT EXISTS (SELECT 1 FROM #{table} j WHERE j.collection_id = c.id AND j.deleted_at IS NULL)"
      end.join(' ')}
    SQL
  end
end
