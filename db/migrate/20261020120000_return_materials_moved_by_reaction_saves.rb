# frozen_string_literal: true

# Saving a reaction could move a material link of another reaction to the saved one: a copy of a
# reaction saved by an older client took the original's purification solvents, and a pending sample
# could take a link of the reaction it was added from. The original reaction then lost the material
# and the saved reaction used the original's sample, so its edits changed the original's amounts.
#
# AddUniqueIndexToReactionsSamples (20261013120000) returns moved links that left a second link in
# the saved reaction. This migration returns the other moved links found in the logidze history:
#
# 1. The link goes back to the reaction it was created in, with the values it had there.
# 2. The reaction that took it keeps the material as a new sample, split from the original sample
#    with the current amounts, in that reaction's collections, with the link's current values. Its
#    variations are re-keyed to the new sample.
# 3. The original sample gets back the amounts it had before the move (from its own history).
#
# Only links moved once, between two live reactions, are returned. The migration reports the
# others, and samples that the move left in collections of the reaction that took them.
class ReturnMaterialsMovedByReactionSaves < ActiveRecord::Migration[6.1]
  # columns of a link that a reaction save writes, and that are restored from its history
  LINK_COLUMNS = %w[
    type reference equivalent position waste coefficient show_label gas_type gas_phase_data
    conversion_rate weight_percentage weight_percentage_reference
  ].freeze
  # sample columns a reaction save changes for its materials
  AMOUNT_COLUMNS = %w[target_amount_value target_amount_unit real_amount_value real_amount_unit].freeze
  # a save writes the sample a few milliseconds before it moves the link: sample versions this close
  # to the move belong to the save that moved it
  MOVE_SAVE_WINDOW_MS = 5_000
  # logidze keeps the full value of a jsonb column only in the first version; later versions hold a
  # nested diff of the changed keys, with 'deleted' for a removed object
  JSONB_COLUMNS = %w[gas_phase_data].freeze

  def up
    counts = Hash.new(0)
    returned = []
    moved_links.each do |link|
      outcome = return_link(link)
      counts[outcome] += 1
      next unless outcome == :returned

      returned << link
      counts[:amounts] += 1 if restore_amounts(link['sample_id'], link['moved_at']).any?
    end

    say "returned #{counts[:returned]} moved reaction-sample link(s) to their original reaction"
    say "restored the amounts of #{counts[:amounts]} sample(s) from before the move"
    say "skipped #{counts[:chained]} link(s) moved more than once"
    say "skipped #{counts[:origin_gone]} link(s) whose original reaction is deleted"
    say "#{memberships_left(returned)} returned sample(s) are still in a collection of the reaction that took them " \
        'and in none of their own reaction there (not changed)'
  end

  # The returned links and the new samples are not changed back.
  def down; end

  private

  # Live links of live reactions and samples whose history names another reaction first.
  def moved_links
    select_all(<<~SQL.squish).to_a
      SELECT rs.id, rs.reaction_id, rs.sample_id, rs.log_data
      FROM reactions_samples rs
      JOIN reactions r ON r.id = rs.reaction_id AND r.deleted_at IS NULL
      JOIN samples s ON s.id = rs.sample_id AND s.deleted_at IS NULL
      WHERE rs.deleted_at IS NULL
        AND rs.log_data IS NOT NULL
        AND (rs.log_data #>> '{h,0,c,reaction_id}')::integer <> rs.reaction_id
      ORDER BY rs.id
    SQL
  end

  # @return [Symbol] what happened to the link
  def return_link(link)
    history = parse_json(link['log_data'])['h']
    origin_id = history.first['c']['reaction_id']
    moves = history.drop(1).select { |version| version['c'].key?('reaction_id') }
    return :chained unless moves.size == 1 && moves.first['c']['reaction_id'] == link['reaction_id']
    return :origin_gone unless live_reaction?(origin_id)

    link['origin_id'] = origin_id
    link['moved_at'] = moves.first['ts']
    split_and_return(link, snapshot_before(history, moves.first))
    :returned
  end

  def split_and_return(link, snapshot)
    type = select_value("SELECT type FROM reactions_samples WHERE id = #{connection.quote(link['id'])}")
    new_sample = give_taker_new_sample(link)
    restore_link(link['id'], link['origin_id'], snapshot)
    rekey_variations(link['reaction_id'], type, link['sample_id'], new_sample.id)
  end

  def live_reaction?(id)
    select_value("SELECT 1 FROM reactions WHERE id = #{connection.quote(id)} AND deleted_at IS NULL").present?
  end

  # The link as it was in its original reaction: every version before the move merged.
  def snapshot_before(history, move)
    history.take_while { |version| !version.equal?(move) }.each_with_object({}) do |version, snapshot|
      apply_changes(snapshot, version['c'])
    end
  end

  # A new sample for the reaction that took the link, with the current amounts and link values.
  #
  # @return [Sample] the new sample
  def give_taker_new_sample(link)
    reaction = Reaction.find(link['reaction_id'])
    sample = Sample.find(link['sample_id'])
    user = User.with_deleted.find_by(id: reaction.created_by) || User.with_deleted.find_by(id: sample.created_by)
    raise "no user to own a new sample for reaction-sample link #{link['id']}" unless user

    new_sample = sample.create_subsample(user, reaction.collections.pluck(:id), true, 'reaction')
    copy_link_to(link['id'], new_sample.id)
    new_sample
  end

  # Inserts a link of the same reaction, with the same values, to the given sample.
  def copy_link_to(link_id, sample_id)
    columns = LINK_COLUMNS.map { |column| connection.quote_column_name(column) }.join(', ')
    execute(<<~SQL.squish)
      INSERT INTO reactions_samples (reaction_id, sample_id, #{columns}, created_at, updated_at)
      SELECT reaction_id, #{connection.quote(sample_id)}, #{columns}, now(), now()
      FROM reactions_samples WHERE id = #{connection.quote(link_id)}
    SQL
  end

  # Renames the moved sample's key to the new sample in the variations of the reaction that took it.
  # Only that key changes; the variations are otherwise left as they are.
  def rekey_variations(reaction_id, type, sample_id, new_sample_id)
    group = ReactionVariationMaterialKeys.variations_group_for(
      type.delete_prefix('Reactions').delete_suffix('Sample').underscore,
    )
    return if group.nil?

    reaction = Reaction.find(reaction_id)
    variations = Array(reaction.variations).map do |variation|
      rekey_variation(variation, group, sample_id.to_s, new_sample_id.to_s)
    end
    reaction.update_column(:variations, variations) unless variations == reaction.variations # rubocop:disable Rails/SkipsModelValidations
  end

  def rekey_variation(variation, group, old_key, new_key)
    materials = variation.is_a?(Hash) ? variation[group] : nil
    return variation unless materials.is_a?(Hash) && materials.key?(old_key)

    variation.merge(group => materials.transform_keys { |key| key == old_key ? new_key : key })
  end

  def restore_link(id, origin_id, snapshot)
    values = snapshot.slice(*LINK_COLUMNS)
    # the original reaction may have a new reference material since
    values.delete('reference') if values['reference'] && reference_taken?(origin_id)
    assignments = values.map do |column, value|
      value = value.to_json if value.is_a?(Hash)
      "#{connection.quote_column_name(column)} = #{connection.quote(value)}"
    end
    assignments << "reaction_id = #{connection.quote(origin_id)}" << 'updated_at = now()'
    execute("UPDATE reactions_samples SET #{assignments.join(', ')} WHERE id = #{connection.quote(id)}")
  end

  def reference_taken?(reaction_id)
    select_value(<<~SQL.squish).present?
      SELECT 1 FROM reactions_samples
      WHERE reaction_id = #{connection.quote(reaction_id)} AND reference AND deleted_at IS NULL
    SQL
  end

  # Sets the sample's amounts back to their values before the save that moved its link.
  #
  # @return [Hash{String => Object}] the restored columns and values; empty when nothing changed
  def restore_amounts(sample_id, move_ts)
    before = amounts_before(sample_id, move_ts - MOVE_SAVE_WINDOW_MS)
    return {} if before.empty?

    current = select_all("SELECT #{AMOUNT_COLUMNS.join(', ')} FROM samples WHERE id = #{connection.quote(sample_id)}")
              .first
    changed = before.reject { |column, value| same_value?(column, value, current[column]) }
    return {} if changed.empty?

    assignments = changed.map { |column, value| "#{column} = #{connection.quote(value)}" }
    execute("UPDATE samples SET #{assignments.join(', ')} WHERE id = #{connection.quote(sample_id)}")
    changed
  end

  # The sample's amount columns as its history has them at the given time (logidze ms); empty when
  # the history starts later.
  def amounts_before(sample_id, until_ts)
    log_data = parse_json(select_value("SELECT log_data FROM samples WHERE id = #{connection.quote(sample_id)}"))
    versions = Array(log_data.is_a?(Hash) ? log_data['h'] : nil).take_while { |version| version['ts'] <= until_ts }
    versions.each_with_object({}) { |version, snapshot| snapshot.update(version['c']) }.slice(*AMOUNT_COLUMNS)
  end

  def same_value?(column, left, right)
    type = Sample.type_for_attribute(column)
    type.cast(left) == type.cast(right)
  end

  # Returned samples that are in a collection of the reaction that took them which is not a collection
  # of their own reaction. Memberships have no history, so the move's share of them can't be told
  # apart: they are only counted.
  def memberships_left(returned)
    returned.count do |link|
      select_value(<<~SQL.squish).present?
        SELECT 1 FROM collections_samples cs
        JOIN collections_reactions taker ON taker.collection_id = cs.collection_id AND taker.deleted_at IS NULL
          AND taker.reaction_id = #{connection.quote(link['reaction_id'])}
        WHERE cs.sample_id = #{connection.quote(link['sample_id'])} AND cs.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM collections_reactions own
            WHERE own.collection_id = cs.collection_id AND own.deleted_at IS NULL
              AND own.reaction_id = #{connection.quote(link['origin_id'])}
          )
      SQL
    end
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
end
