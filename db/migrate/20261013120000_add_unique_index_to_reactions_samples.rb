# frozen_string_literal: true

# A sample belongs to at most one reaction, in one role. Saving a reaction whose sample was also
# linked to another reaction could move that other reaction's link to the saved one, so the saved
# reaction listed the sample twice and the other reaction lost it. The lookup is now scoped to the
# saved reaction. This migration repairs the links and adds a unique index on the sample of a live
# link:
#
# 1. A moved link is a live row that duplicates another link of its reaction, and whose logidze
#    history names another reaction first. It goes back to that reaction, with the values it had
#    there, if that reaction is not deleted and does not link the sample itself. If the moved link
#    was updated after the own link of the reaction it is taken from, its current values are
#    copied to the own link first, so that reaction keeps its latest values.
# 2. A sample that still has several live links stays with the link of the earliest created
#    reaction (the earlier link, if that reaction links it twice). Every other link gets a new
#    sample, split from it as the reaction editor does when a sample is dropped onto a reaction.
#    A link of a deleted reaction, or of a deleted sample, is soft deleted instead.
class AddUniqueIndexToReactionsSamples < ActiveRecord::Migration[6.1]
  INDEX_NAME = 'index_reactions_samples_on_live_sample_id'
  # the index of an earlier version of this migration
  PREVIOUS_INDEX_NAME = 'index_reactions_samples_on_reaction_id_sample_id'
  # columns that saving a reaction writes to the link, and are restored from the history
  RESTORED_COLUMNS = %w[
    type reference equivalent position waste coefficient show_label gas_type gas_phase_data
    conversion_rate weight_percentage weight_percentage_reference
  ].freeze
  # logidze keeps the full value of a jsonb column only in the first version; later versions
  # hold a nested diff of the changed keys, with 'deleted' for a removed object
  JSONB_COLUMNS = %w[gas_phase_data].freeze

  def up
    links = moved_links
    moved_ids = links.pluck('id')
    # checked link by link, a reaction can get back one of several links moved from it
    restored = links.count do |link|
      next false unless restorable?(link['snapshot']['reaction_id'], link['sample_id'])

      keep_latest_values(link['id'], moved_ids)
      restore_link(link['id'], link['snapshot'])
      refresh_tags([link['sample_id']])
      true
    end
    say "returned #{restored} reaction-sample link(s) to their original reaction"

    split, removed = split_shared_samples
    say "gave #{split} reaction-sample link(s) a new sample"
    say "soft deleted #{removed} reaction-sample link(s) of a deleted reaction or sample"

    add_index :reactions_samples, :sample_id, unique: true, where: 'deleted_at IS NULL', name: INDEX_NAME
  end

  # The repaired links and the new samples are not changed back.
  def down
    remove_index :reactions_samples, name: INDEX_NAME, if_exists: true
    remove_index :reactions_samples, name: PREVIOUS_INDEX_NAME, if_exists: true
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

  # Copies the values of the moved link to the own links of its current reaction to the same sample
  # that were updated before it. The own link takes the time of the moved link's last update, so a
  # moved link updated later still wins.
  def keep_latest_values(id, moved_ids)
    assignments = RESTORED_COLUMNS.map do |column|
      quoted = connection.quote_column_name(column)
      "#{quoted} = moved.#{quoted}"
    end
    execute(<<~SQL.squish)
      UPDATE reactions_samples own SET #{assignments.join(', ')}, updated_at = moved.updated_at
      FROM reactions_samples moved
      WHERE moved.id = #{connection.quote(id)}
        AND own.reaction_id = moved.reaction_id AND own.sample_id = moved.sample_id
        AND own.id NOT IN (#{moved_ids.map { |moved_id| connection.quote(moved_id) }.join(', ')})
        AND own.deleted_at IS NULL
        AND moved.updated_at IS NOT NULL
        AND (own.updated_at IS NULL OR own.updated_at < moved.updated_at)
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

  # Returns the number of links that got a new sample, and the number of links soft deleted.
  #
  # Each split runs in its own savepoint. The unique index needs every split, so failures don't skip:
  # they are collected and raised together, naming every link, before the index is added.
  #
  # @raise [RuntimeError] listing every link that could not get a new sample
  def split_shared_samples
    links = extra_links
    dead, live = links.partition { |link| link['dead'] }
    soft_delete_links(dead.pluck('id')) if dead.any?
    failures = live.filter_map do |link|
      ActiveRecord::Base.transaction(requires_new: true) { give_new_sample(link['id']) }
      nil
    rescue StandardError => e
      "reaction-sample link #{link['id']} (sample #{link['sample_id']}): #{e.class}: #{e.message}"
    end
    raise "#{failures.size} shared sample link(s) could not get a new sample:\n#{failures.join("\n")}" if failures.any?

    [live.size, dead.size]
  end

  # Every live link of a sample but the first: links of live reactions first, by reaction creation
  # and then link creation.
  def extra_links
    select_all(<<~SQL.squish).to_a
      SELECT id, sample_id, dead FROM (
        SELECT rs.id, rs.sample_id,
          (r.id IS NULL OR r.deleted_at IS NOT NULL OR s.id IS NULL OR s.deleted_at IS NOT NULL) AS dead,
          row_number() OVER (
            PARTITION BY rs.sample_id
            ORDER BY (r.id IS NULL OR r.deleted_at IS NOT NULL), r.created_at NULLS LAST, r.id, rs.id
          ) AS rank
        FROM reactions_samples rs
        LEFT JOIN reactions r ON r.id = rs.reaction_id
        LEFT JOIN samples s ON s.id = rs.sample_id
        WHERE rs.deleted_at IS NULL
      ) ranked
      WHERE rank > 1
      ORDER BY id
    SQL
  end

  def soft_delete_links(ids)
    quoted_ids = ids.map { |id| connection.quote(id) }.join(', ')
    execute("UPDATE reactions_samples SET deleted_at = now() WHERE id IN (#{quoted_ids})")
  end

  def give_new_sample(link_id)
    link = ReactionsSample.find(link_id)
    reaction = link.reaction
    sample = link.sample
    user = new_sample_owner(reaction, sample)
    raise "no live user to own a new sample for reaction #{reaction.id}" unless user

    new_sample = sample.create_subsample(user, reaction.collections.pluck(:id), true, 'reaction')
    execute(<<~SQL.squish)
      UPDATE reactions_samples SET sample_id = #{connection.quote(new_sample.id)}, updated_at = now()
      WHERE id = #{connection.quote(link_id)}
    SQL
    refresh_tags([sample.id, new_sample.id])
  end

  # The owner of a new sample: the reaction's creator, else the sample's, else the owner of one of the
  # reaction's collections. A sample's creator must be a live user.
  #
  # @return [User, nil] nil when none of them is a live user
  def new_sample_owner(reaction, sample)
    User.find_by(id: reaction.created_by) || User.find_by(id: sample.created_by) ||
      User.find_by(id: reaction.collections.where.not(user_id: nil).select(:user_id))
  end

  # The raw updates skip the ReactionsSample callbacks: refresh the reaction in the samples' element tags.
  def refresh_tags(sample_ids)
    ReactionsSample.where(sample_id: sample_ids).find_each { |link| link.update_tag if link.respond_to?(:update_tag) }
  end
end
