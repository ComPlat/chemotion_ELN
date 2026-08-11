# frozen_string_literal: true

class RemoveGroupAllCollections < ActiveRecord::Migration[6.1]
  # The "All" collection exists to back the MyDB element paths — every element its owner owns is a
  # member of it. A group account never renders MyDB: config/routes.rb routes a +Group+ session to
  # the command-and-control view for `/`, `/group`, `/mydb` and `/mydb/*any`. So a group's "All" has
  # never been reachable by anybody, and +User#create_all_collection+ no longer makes one.
  #
  # It was not merely unused, either. Until ownership was narrowed to the user,
  # +Collection.own_collections_for+ resolved a user's collections as `user_id IN (self, *group_ids)`,
  # so a group's locked "All" arrived in every member's tree payload.
  #
  # Same shape and the same reasoning as 20260810120000_remove_group_repository_collections: a
  # soft delete (+Collection+ is +acts_as_paranoid+, and +LockedCollectionGuard+ aborts +destroy+ on
  # a locked row), only rows that hold nothing, anything with content reported and left alone, and
  # an irreversible +down+ because nothing on the row distinguishes these soft deletes from anyone
  # else's.

  ALL_LABEL = 'All'

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
      WHERE c.label = '#{ALL_LABEL}'
        AND c.is_locked
        AND c.deleted_at IS NULL
        AND NOT (#{empty_predicate})
    SQL
    kept.each { |id| say "keeping group \"#{ALL_LABEL}\" collection ##{id}: it still holds content" }

    say_with_time 'soft-deleting the empty "All" collections of group accounts' do
      execute(<<~SQL.squish)
        UPDATE collections c
        SET deleted_at = NOW()
        FROM users u
        WHERE u.id = c.user_id
          AND u.type = 'Group'
          AND c.label = '#{ALL_LABEL}'
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
          'RemoveGroupAllCollections is not reversible (its soft deletes are indistinguishable).'
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
