# frozen_string_literal: true

class DedupCollectionShares < ActiveRecord::Migration[6.1]
  # Merge duplicate CollectionShare rows for the same (collection, shared_with) pair before
  # 20260709140001 adds a unique index on that pair. Duplicates can arise from the
  # 20250825083741 data migration's plain `CollectionShare.create` (no uniqueness guard) and,
  # going forward, from a same-pair POST /collection_shares race (the API's
  # `find_or_initialize_by` is not backed by a DB constraint today).
  #
  # "Combine the different sharings" per the discussion this migration follows up on
  # (github.com/ComPlat/chemotion_ELN/issues/1599#issuecomment-1787467505): rather than picking
  # an arbitrary survivor, every duplicate group is first widened to the most permissive value
  # per column (MAX — PERMISSION_LEVELS and the detail levels are both ordered least-to-most
  # permissive), then all but one row per group are dropped.
  DETAIL_LEVEL_COLUMNS = %i[
    celllinesample_detail_level
    devicedescription_detail_level
    element_detail_level
    reaction_detail_level
    researchplan_detail_level
    sample_detail_level
    screen_detail_level
    sequencebasedmacromoleculesample_detail_level
    wellplate_detail_level
  ].freeze

  def up
    duplicate_pairs = select_value(<<~SQL.squish).to_i
      SELECT COUNT(*) FROM (
        SELECT collection_id, shared_with_id
        FROM collection_shares
        GROUP BY collection_id, shared_with_id
        HAVING COUNT(*) > 1
      ) dup
    SQL

    if duplicate_pairs.zero?
      say 'no duplicate (collection_id, shared_with_id) pairs found, nothing to merge'
      return
    end

    say "merging #{duplicate_pairs} duplicate (collection_id, shared_with_id) pair(s)"
    widen_duplicates_to_most_permissive_values
    removed = drop_all_but_one_row_per_pair
    say "removed #{removed} duplicate collection_shares row(s) after merging their permissions"
  end

  def down
    # Irreversible: the merged/removed rows cannot be reconstructed. Schema-only companion
    # migration 20260709140001 is what the `down` chain actually needs to reverse.
  end

  private

  def mergeable_columns
    [:permission_level] + DETAIL_LEVEL_COLUMNS
  end

  def widen_duplicates_to_most_permissive_values
    aggregate_columns = mergeable_columns.map { |column| "MAX(#{column}) AS #{column}" }.join(', ')
    set_columns = mergeable_columns.map { |column| "#{column} = aggregated.#{column}" }.join(', ')

    execute(<<~SQL.squish)
      WITH aggregated AS (
        SELECT collection_id, shared_with_id, #{aggregate_columns}
        FROM collection_shares
        GROUP BY collection_id, shared_with_id
        HAVING COUNT(*) > 1
      )
      UPDATE collection_shares
      SET #{set_columns}
      FROM aggregated
      WHERE collection_shares.collection_id = aggregated.collection_id
        AND collection_shares.shared_with_id = aggregated.shared_with_id
    SQL
  end

  def drop_all_but_one_row_per_pair
    execute(<<~SQL.squish).cmd_tuples
      DELETE FROM collection_shares
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY collection_id, shared_with_id ORDER BY id) AS rnum
          FROM collection_shares
        ) ranked
        WHERE ranked.rnum > 1
      )
    SQL
  end
end
