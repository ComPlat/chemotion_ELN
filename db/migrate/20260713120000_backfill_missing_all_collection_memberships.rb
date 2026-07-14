# frozen_string_literal: true

class BackfillMissingAllCollectionMemberships < ActiveRecord::Migration[6.1]
  # Every element owned by a user — present in some collection whose `user_id` is that user — must
  # also sit in that owner's locked "All" collection. The element create paths append the owner's
  # "All", but data drift (older imports, the collection-share refactor, moves) can leave an element
  # in an owned collection without the matching "All" row, which the ownership-derived logic relies
  # on. This backfills the missing (element, owner's-All) join rows straight from the join tables.
  #
  # Idempotent: NOT EXISTS skips memberships already present, and ON CONFLICT resurrects a
  # soft-deleted "All" row rather than colliding. Vessels are excluded (uuid-keyed, and the create
  # paths never maintain a vessel "All").

  # [join table, element foreign key]
  JOIN_TABLES = [
    %w[collections_samples sample_id],
    %w[collections_reactions reaction_id],
    %w[collections_wellplates wellplate_id],
    %w[collections_screens screen_id],
    %w[collections_research_plans research_plan_id],
    %w[collections_celllines cellline_sample_id],
    %w[collections_device_descriptions device_description_id],
    %w[collections_sequence_based_macromolecule_samples sequence_based_macromolecule_sample_id],
    %w[collections_elements element_id],
  ].freeze

  def up
    JOIN_TABLES.each do |join_table, fk|
      say_with_time "backfilling missing All memberships for #{join_table}" do
        execute(<<~SQL.squish)
          INSERT INTO #{join_table} (#{fk}, collection_id)
          SELECT DISTINCT cj.#{fk}, all_c.id
          FROM #{join_table} cj
          JOIN collections owner_c ON owner_c.id = cj.collection_id
                                  AND owner_c.deleted_at IS NULL
          JOIN collections all_c   ON all_c.user_id = owner_c.user_id
                                  AND all_c.label = 'All' AND all_c.is_locked
                                  AND all_c.deleted_at IS NULL
          WHERE cj.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM #{join_table} ex
              WHERE ex.#{fk} = cj.#{fk}
                AND ex.collection_id = all_c.id
                AND ex.deleted_at IS NULL
            )
          ON CONFLICT (#{fk}, collection_id) DO UPDATE SET deleted_at = NULL;
        SQL
      end
    end
  end

  def down
    # Irreversible: the inserted "All" memberships are indistinguishable from legitimately-present
    # ones, so there is nothing safe to delete.
    say 'BackfillMissingAllCollectionMemberships is not reversible (membership rows cannot be safely removed).'
  end
end
