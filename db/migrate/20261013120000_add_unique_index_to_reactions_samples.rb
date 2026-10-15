# frozen_string_literal: true

# Saving a reaction whose sample was also linked to another reaction could move that other
# reaction's link to the saved one, so the saved reaction listed the sample twice and the other
# reaction lost it. The lookup is now scoped to the saved reaction. This migration repairs the
# links and adds a unique index so a reaction cannot link the same sample twice:
#
# 1. A moved link is a live row that duplicates another link of its reaction, and whose logidze
#    history names another reaction first. It goes back to that reaction, with the values it had
#    there, if that reaction is not deleted and does not link the sample itself.
# 2. Of the duplicates still left, the most recently updated row is kept, the others are
#    soft deleted.
class AddUniqueIndexToReactionsSamples < ActiveRecord::Migration[6.1]
  INDEX_NAME = 'index_reactions_samples_on_reaction_id_sample_id'
  # columns that saving a reaction writes to the link, and are restored from the history
  RESTORED_COLUMNS = %w[
    type reference equivalent position waste coefficient show_label gas_type gas_phase_data
    conversion_rate weight_percentage weight_percentage_reference
  ].freeze
  # logidze keeps the full value of a jsonb column only in the first version; later versions
  # hold a nested diff of the changed keys, with 'deleted' for a removed object
  JSONB_COLUMNS = %w[gas_phase_data].freeze

  def up
    # checked link by link, a reaction can get back one of several links moved from it
    restored = moved_links.count do |link|
      next false unless restorable?(link['snapshot']['reaction_id'], link['sample_id'])

      restore_link(link['id'], link['snapshot'])
      true
    end
    say "returned #{restored} reaction-sample link(s) to their original reaction"

    removed = soft_delete_duplicates
    say "soft deleted #{removed} duplicate reaction-sample link(s)"

    add_index :reactions_samples, %i[reaction_id sample_id],
              unique: true, where: 'deleted_at IS NULL', name: INDEX_NAME
  end

  # The repaired links are not changed back.
  def down
    remove_index :reactions_samples, name: INDEX_NAME
  end

  private

  def moved_links
    select_all(<<~SQL.squish).map { |link| link.merge('snapshot' => snapshot_before_move(link['log_data'])) }
      SELECT rs.id, rs.sample_id, rs.log_data
      FROM reactions_samples rs
      JOIN (
        SELECT reaction_id, sample_id FROM reactions_samples
        WHERE deleted_at IS NULL
        GROUP BY reaction_id, sample_id HAVING count(*) > 1
      ) duplicates ON duplicates.reaction_id = rs.reaction_id AND duplicates.sample_id = rs.sample_id
      WHERE rs.deleted_at IS NULL
        AND (rs.log_data #>> '{h,0,c,reaction_id}')::integer <> rs.reaction_id
      ORDER BY rs.id
    SQL
  end

  def restore_link(id, snapshot)
    assignments = (RESTORED_COLUMNS & snapshot.keys).map do |column|
      value = snapshot[column].is_a?(Hash) ? snapshot[column].to_json : snapshot[column]
      "#{connection.quote_column_name(column)} = #{connection.quote(value)}"
    end
    assignments << "reaction_id = #{connection.quote(snapshot['reaction_id'])}" << 'updated_at = now()'
    execute("UPDATE reactions_samples SET #{assignments.join(', ')} WHERE id = #{connection.quote(id)}")
  end

  # The row as it was in its first reaction: the versions merged up to the last one in which
  # the row still belonged to that reaction.
  def snapshot_before_move(log_data)
    log_data = JSON.parse(log_data) if log_data.is_a?(String)
    versions = log_data['h']
    original_reaction_id = versions.first['c']['reaction_id']
    snapshot = {}
    versions.each do |version|
      changes = version['c']
      break if changes.key?('reaction_id') && changes['reaction_id'] != original_reaction_id

      apply_changes(snapshot, changes)
    end
    snapshot
  end

  def apply_changes(snapshot, changes)
    changes.each do |column, value|
      snapshot[column] = if JSONB_COLUMNS.include?(column)
                           apply_diff(parse_json(snapshot[column]), parse_json(value))
                         else
                           value
                         end
    end
  end

  def apply_diff(value, diff)
    return diff unless value.is_a?(Hash) && diff.is_a?(Hash)

    diff.each_with_object(value.dup) do |(key, change), merged|
      if change == 'deleted' && merged[key].is_a?(Hash)
        merged.delete(key)
      else
        merged[key] = apply_diff(merged[key], change)
      end
    end
  end

  def parse_json(value)
    value.is_a?(String) ? JSON.parse(value) : value
  rescue JSON::ParserError
    value
  end

  def restorable?(reaction_id, sample_id)
    select_value(<<~SQL.squish)
      SELECT 1 FROM reactions r
      WHERE r.id = #{connection.quote(reaction_id)} AND r.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM reactions_samples rs
          WHERE rs.reaction_id = r.id AND rs.sample_id = #{connection.quote(sample_id)} AND rs.deleted_at IS NULL
        )
    SQL
  end

  def soft_delete_duplicates
    execute(<<~SQL.squish).cmd_tuples
      UPDATE reactions_samples SET deleted_at = now()
      WHERE id IN (
        SELECT id FROM (
          SELECT id, row_number() OVER (
            PARTITION BY reaction_id, sample_id ORDER BY updated_at DESC NULLS LAST, id DESC
          ) AS rank
          FROM reactions_samples WHERE deleted_at IS NULL
        ) ranked
        WHERE rank > 1
      )
    SQL
  end
end
