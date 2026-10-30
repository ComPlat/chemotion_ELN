# frozen_string_literal: true

# Adds a reaction's samples to every collection that holds the reaction.
#
# The invariant: for every live +collections_reactions+ row (collection C, reaction R), each live
# sample linked to R through +reactions_samples+ (starting material, reactant, solvent,
# purification solvent, product) has a live +collections_samples+ row for C. The write paths keep it
# ({CollectionsReaction.create_in_collection}, the +ReactionSampleCollections+ hook), but existing
# data can lack it: a sample removed from a collection while still used by another reaction there,
# a reaction sample re-associated rather than created, older imports and moves. A collection export
# then writes a reaction that references a sample the archive does not contain, and that archive
# cannot be imported.
#
# Collection membership decides ownership, so a pair is only repaired when C's owner already owns
# the sample, or when nobody does (the sample is in no live collection). A pair whose sample belongs
# to someone else is reported as +:cross_owner+ and left alone: adding it would hand the sample to
# C's owner.
#
# Rows are written with raw SQL, so the +Tagging+ callbacks don't run; the +collection_labels+ of
# the repaired samples' element tags are rebuilt explicitly, as
# +BackfillElementTagCollectionLabels+ does.
#
# Idempotent: a second run finds no missing same-owner pair.
module RepairReactionSampleCollectionsTask
  Result = Struct.new(:collection_id, :sample_id, :reaction_id, :action)

  LOG_TAG = '[RepairReactionSampleCollections]'

  # Missing (collection, sample) pairs, one row per pair, with one of the reactions that requires
  # it and whether the collection's owner may receive the sample.
  MISSING_PAIRS_SQL = <<~SQL.squish
    SELECT DISTINCT ON (cr.collection_id, rs.sample_id)
           cr.collection_id, rs.sample_id, cr.reaction_id,
           (
             NOT EXISTS (
               SELECT 1 FROM collections_samples cs_any
               JOIN collections c_any ON c_any.id = cs_any.collection_id AND c_any.deleted_at IS NULL
               WHERE cs_any.sample_id = rs.sample_id AND cs_any.deleted_at IS NULL
             )
             OR EXISTS (
               SELECT 1 FROM collections_samples cs_own
               JOIN collections c_own ON c_own.id = cs_own.collection_id AND c_own.deleted_at IS NULL
               WHERE cs_own.sample_id = rs.sample_id AND cs_own.deleted_at IS NULL
                 AND c_own.user_id = c.user_id
             )
           ) AS same_owner,
           EXISTS (
             SELECT 1 FROM collections_samples cs_del
             WHERE cs_del.collection_id = cr.collection_id AND cs_del.sample_id = rs.sample_id
           ) AS soft_deleted
    FROM collections_reactions cr
    JOIN collections c        ON c.id = cr.collection_id AND c.deleted_at IS NULL
    JOIN reactions r          ON r.id = cr.reaction_id AND r.deleted_at IS NULL
    JOIN reactions_samples rs ON rs.reaction_id = r.id AND rs.deleted_at IS NULL
    JOIN samples s            ON s.id = rs.sample_id AND s.deleted_at IS NULL
    WHERE cr.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM collections_samples cs
        WHERE cs.collection_id = cr.collection_id AND cs.sample_id = rs.sample_id
          AND cs.deleted_at IS NULL
      )
    ORDER BY cr.collection_id, rs.sample_id, cr.reaction_id
  SQL

  # @param dry_run [Boolean] when true, nothing is written
  # @return [Array<Result>] one result per missing pair; +action+ is +:added+, +:revived+ (a
  #   soft-deleted membership brought back) or +:cross_owner+ (reported, not repaired)
  def self.execute!(dry_run: true)
    results = missing_pairs
    repairable = results.reject { |r| r.action == :cross_owner }
    ActiveRecord::Base.transaction { repair(repairable) } unless dry_run || repairable.empty?
    results.each { |r| log(r, dry_run) }
    results
  end

  # @return [Array<Result>]
  def self.missing_pairs
    connection.select_all(MISSING_PAIRS_SQL).map do |row|
      Result.new(row['collection_id'], row['sample_id'], row['reaction_id'], action_for(row))
    end
  end

  def self.action_for(row)
    return :cross_owner unless row['same_owner']

    row['soft_deleted'] ? :revived : :added
  end

  # Upserts the memberships (the unique index on +(sample_id, collection_id)+ ignores +deleted_at+,
  # so a soft-deleted row is revived rather than duplicated), then rebuilds the samples' tags.
  #
  # @param results [Array<Result>] repairable pairs
  def self.repair(results)
    values = results.map { |r| "(#{Integer(r.sample_id)}, #{Integer(r.collection_id)})" }.join(', ')
    connection.execute(<<~SQL.squish)
      INSERT INTO collections_samples (sample_id, collection_id) VALUES #{values}
      ON CONFLICT (sample_id, collection_id) DO UPDATE SET deleted_at = NULL
    SQL
    refresh_collection_labels(results.map(&:sample_id).uniq)
  end

  # Rebuilds +collection_labels+ from the live memberships, leaving out the locked "All" (the same
  # derivation as +Taggable#collection_tag+).
  #
  # @param sample_ids [Array<Integer>]
  def self.refresh_collection_labels(sample_ids)
    ids = sample_ids.map { |id| Integer(id) }.join(', ')
    connection.execute(<<~SQL.squish)
      UPDATE element_tags e
      SET taggable_data = jsonb_set(COALESCE(e.taggable_data, '{}'::jsonb), '{collection_labels}', d.arr)
      FROM (
        SELECT et.id, jsonb_agg(DISTINCT jsonb_build_object('id', cs.collection_id)) AS arr
        FROM element_tags et
        JOIN collections_samples cs ON cs.sample_id = et.taggable_id AND cs.deleted_at IS NULL
        JOIN collections c          ON c.id = cs.collection_id AND c.deleted_at IS NULL
        WHERE et.taggable_type = 'Sample' AND et.taggable_id IN (#{ids})
          AND NOT (c.label = 'All' AND c.is_locked)
        GROUP BY et.id
      ) d
      WHERE e.id = d.id
    SQL
  end

  def self.log(result, dry_run)
    Rails.logger.info(
      "#{LOG_TAG}#{' [dry run]' if dry_run} #{result.action}: collection #{result.collection_id}, " \
      "sample #{result.sample_id} (reaction #{result.reaction_id})",
    )
  end

  def self.connection
    ActiveRecord::Base.connection
  end

  private_class_method :action_for, :repair, :refresh_collection_labels, :log, :connection
end
