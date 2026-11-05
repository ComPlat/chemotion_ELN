# frozen_string_literal: true

require_relative '../../lib/reactions_sample_history'

# Saving a reaction could move a material link of another reaction to the saved one: a copy of a
# reaction saved by an older client took the original's purification solvents, and a pending sample
# could take a link of the reaction it was added from. The original reaction then lost the material
# and the saved reaction used the original's sample, so its edits changed the original's sample.
#
# AddUniqueIndexToReactionsSamples (20261013120000) returns moved links that left a second link in
# the saved reaction. This migration returns the other moved links found in the logidze history,
# once or several times moved (a copy of a copy):
#
# 1. The link goes back to the reaction it was created in, with the values it had there. A link
#    soft-deleted with its copy is revived when its sample is still live.
# 2. Each reaction that took it and still exists keeps the material: a new sample split from the
#    original (a new sample for products), in that reaction's collections, linked with the values it
#    had there. Its variations are re-keyed to the new sample.
# 3. The original sample gets back the columns the takers' saves changed (amounts, label, name,
#    solvent), as they were before the first move. Columns someone else changed since are kept.
#
# Every link is repaired on its own: a link that can't be repaired is skipped and reported with its
# id. A link is skipped when its original reaction is deleted or already has a material of that
# molecule in that role, when its sample is deleted, or when its history changes the sample.
# rubocop:disable Metrics/ClassLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity -- one-off data repair kept in one migration
class ReturnMaterialsMovedByReactionSaves < ActiveRecord::Migration[6.1]
  History = ReactionsSampleHistory

  # columns of a link that a reaction save writes, and that are restored from its history
  LINK_COLUMNS = %w[
    type reference equivalent position waste coefficient show_label gas_type gas_phase_data
    conversion_rate weight_percentage weight_percentage_reference
  ].freeze
  # flags a reaction holds on one material only
  SINGLE_FLAGS = %w[reference weight_percentage_reference].freeze
  # sample columns a reaction save wrote to an existing sample (UpdateMaterials#update_existing_sample)
  SAMPLE_COLUMNS = %w[
    target_amount_value target_amount_unit real_amount_value real_amount_unit metrics
    name short_label external_label solvent dry_solvent
  ].freeze
  # the amounts a split takes from the time it left a reaction
  SPLIT_COLUMNS = %w[target_amount_value target_amount_unit real_amount_value real_amount_unit metrics].freeze
  # without request metadata, versions written this close to a reaction save belong to that save
  SAVE_WINDOW_MS = 5_000
  # ids listed per reported outcome
  MAX_LISTED_IDS = 200
  REPORTS = {
    returned: 'returned to their original reaction',
    revived: 'revived (soft-deleted with their copy) and returned to their original reaction',
    origin_has_it: 'skipped: the original reaction has a material of that molecule in that role again',
    origin_gone: 'skipped: the original reaction is deleted',
    sample_gone: 'skipped: the sample is deleted',
    sample_elsewhere: 'skipped: soft-deleted with its copy, and its sample has another live link now',
    sample_changed: 'skipped: the history changes the sample',
    no_history: 'skipped: the history names no first reaction',
    failed: 'failed and left unchanged',
  }.freeze

  def up
    outcomes = Hash.new { |hash, key| hash[key] = [] }
    notes = Hash.new { |hash, key| hash[key] = [] }
    moved_links.each do |link|
      outcome = ActiveRecord::Base.transaction(requires_new: true) { repair(link, notes) }
      outcomes[outcome] << link['id']
    rescue StandardError => e
      outcomes[:failed] << "#{link['id']} (#{e.class})"
    end
    report(outcomes, notes)
  end

  # The returned links and the new samples are not changed back.
  def down; end

  private

  # Links whose history names another reaction first, live or soft-deleted.
  def moved_links
    select_all(<<~SQL.squish).to_a
      SELECT rs.id, rs.reaction_id, rs.sample_id, rs.type, rs.log_data, s.molecule_id,
             (rs.deleted_at IS NULL AND r.id IS NOT NULL AND r.deleted_at IS NULL) AS live,
             (s.id IS NOT NULL AND s.deleted_at IS NULL) AS sample_live
      FROM reactions_samples rs
      LEFT JOIN reactions r ON r.id = rs.reaction_id
      LEFT JOIN samples s ON s.id = rs.sample_id
      WHERE rs.log_data IS NOT NULL
        AND (rs.log_data #>> '{h,0,c,reaction_id}') IS NOT NULL
        AND (rs.log_data #>> '{h,0,c,reaction_id}')::integer IS DISTINCT FROM rs.reaction_id
      ORDER BY rs.id
    SQL
  end

  # Returns one moved link and gives its takers their own samples.
  #
  # @param link [Hash] a row of {#moved_links}
  # @param notes [Hash{Symbol => Array}] collects findings to report (ids)
  # @return [Symbol] the outcome, a key of {REPORTS}
  def repair(link, notes)
    history = History.versions(link['log_data'])
    stretches = History.reaction_stretches(history)
    skip = skip_reason(link, history, stretches)
    return skip if skip

    sample = Sample.find(link['sample_id'])
    origin_id = stretches.first[:reaction_id]
    give_takers_samples(link, sample, history, stretches)
    # the values of the origin's last stretch (a chain can pass through it again)
    last_in_origin = stretches.reverse.find { |stretch| stretch[:reaction_id] == origin_id }
    restore_link(link['id'], origin_id, History.snapshot(history[0..last_in_origin[:last]]))
    restore_sample(sample, history, stretches, notes)
    note_leftovers(link, sample, history[stretches[1][:first]]['ts'], stretches.first[:reaction_id], notes)
    link['live'] ? :returned : :revived
  end

  def skip_reason(link, history, stretches)
    return :no_history if stretches.size < 2 || link['type'].nil?
    return :sample_changed if history.drop(1).any? { |version| version['c'].key?('sample_id') }
    return :sample_gone unless link['sample_live']

    origin_id = stretches.first[:reaction_id]
    return :origin_gone unless live_reaction?(origin_id)
    return :origin_has_it if material?(origin_id, link['type'], link['molecule_id'])

    :sample_elsewhere if !link['live'] && other_live_link?(link)
  end

  # The current holder (when its link is live) and every reaction the link passed through get a sample
  # of their own, unless they have that material again or are deleted.
  def give_takers_samples(link, sample, history, stretches)
    origin_id = stretches.first[:reaction_id]
    holder_id = link['live'] ? link['reaction_id'] : nil
    give_sample(holder_id, sample, current_link_values(link['id']), nil, link['id']) if holder_id
    stretches.each_with_index.drop(1).reverse_each.uniq { |stretch, _| stretch[:reaction_id] }.each do |stretch, index|
      reaction_id = stretch[:reaction_id]
      next if [origin_id, holder_id].include?(reaction_id) || index == stretches.size - 1
      next unless live_reaction?(reaction_id) && !material?(reaction_id, link['type'], link['molecule_id'])

      left_at = history[stretches[index + 1][:first]]
      give_sample(reaction_id, sample, History.snapshot(history[0..stretch[:last]]), left_at, link['id'])
    end
  end

  # Links the reaction to a new sample split from +sample+.
  #
  # @param values [Hash] the link values in that reaction
  # @param left_at [Hash, nil] the link version that took the material out of that reaction: the split
  #   takes the sample's amounts of that time; nil keeps the current amounts
  # @param moved_id [Integer] the moved link, ignored when checking the reaction's single flags
  def give_sample(reaction_id, sample, values, left_at, moved_id)
    reaction = Reaction.find(reaction_id)
    new_sample = new_sample_for(reaction, sample, values['type'])
    if left_at
      amounts = sample_before(sample, left_at).slice(*SPLIT_COLUMNS)
      new_sample.update_columns(amounts) if amounts.any? # rubocop:disable Rails/SkipsModelValidations
    end
    insert_link(reaction_id, new_sample.id, guard_single_flags(reaction_id, values.slice(*LINK_COLUMNS), moved_id))
    rekey_variations(reaction, values['type'], sample.id, new_sample.id)
  end

  def new_sample_for(reaction, sample, type)
    user = User.with_deleted.find_by(id: reaction.created_by) || User.with_deleted.find_by(id: sample.created_by)
    raise ActiveRecord::RecordNotFound, "no user to own a sample of reaction #{reaction.id}" unless user

    new_sample = sample.create_subsample(user, reaction.collections.pluck(:id), true, 'reaction')
    # a product is a new sample, not a split (as the reaction editor creates it)
    new_sample.update!(parent: nil, short_label: nil) if type == 'ReactionsProductSample'
    new_sample
  end

  def current_link_values(link_id)
    select_all("SELECT #{LINK_COLUMNS.join(', ')} FROM reactions_samples WHERE id = #{connection.quote(link_id)}")
      .first
  end

  def insert_link(reaction_id, sample_id, values)
    columns = values.keys.map { |column| connection.quote_column_name(column) }
    execute(<<~SQL.squish)
      INSERT INTO reactions_samples (reaction_id, sample_id, #{columns.join(', ')}, created_at, updated_at)
      VALUES (#{connection.quote(reaction_id)}, #{connection.quote(sample_id)},
              #{values.values.map { |value| quote_value(value) }.join(', ')}, now(), now())
    SQL
  end

  def restore_link(id, origin_id, snapshot)
    values = guard_single_flags(origin_id, snapshot.slice(*LINK_COLUMNS), id)
    assignments = values.map { |column, value| "#{connection.quote_column_name(column)} = #{quote_value(value)}" }
    assignments << "reaction_id = #{connection.quote(origin_id)}" << 'deleted_at = NULL' << 'updated_at = now()'
    execute("UPDATE reactions_samples SET #{assignments.join(', ')} WHERE id = #{connection.quote(id)}")
  end

  # A reaction holds +reference+ and +weight_percentage_reference+ on one material only: a flag another
  # live link of the reaction holds (other than the moved link) is set to false.
  def guard_single_flags(reaction_id, values, moved_id)
    SINGLE_FLAGS.each_with_object(values.dup) do |flag, guarded|
      next unless ActiveModel::Type::Boolean.new.cast(guarded[flag])

      taken = select_value(<<~SQL.squish).present?
        SELECT 1 FROM reactions_samples
        WHERE reaction_id = #{connection.quote(reaction_id)} AND #{flag} AND deleted_at IS NULL
          AND id <> #{connection.quote(moved_id)}
      SQL
      guarded[flag] = false if taken
    end
  end

  # Renames the old sample's key to the new sample in the reaction's stored variations (keyed by
  # variation uuid, or an array in older data), keeping their shape. Nothing else changes.
  def rekey_variations(reaction, type, sample_id, new_sample_id)
    group = ReactionVariationMaterialKeys.variations_group_for(
      type.delete_prefix('Reactions').delete_suffix('Sample').underscore,
    )
    raw = reaction[:variations]
    return if group.nil? || raw.blank?

    rename = ->(variation) { rekey_variation(variation, group, sample_id.to_s, new_sample_id.to_s) }
    rekeyed = raw.is_a?(Hash) ? raw.transform_values(&rename) : Array(raw).map(&rename)
    reaction.update_column(:variations, rekeyed) unless rekeyed == raw # rubocop:disable Rails/SkipsModelValidations
  end

  def rekey_variation(variation, group, old_key, new_key)
    materials = variation.is_a?(Hash) ? variation[group] : nil
    return variation unless materials.is_a?(Hash) && materials.key?(old_key)

    variation.merge(group => materials.transform_keys { |key| key == old_key ? new_key : key })
  end

  # Sets the sample's columns back to their values before the first move, where every later change of
  # the column came from a save of a reaction that took it.
  def restore_sample(sample, history, stretches, notes)
    move = history[stretches[1][:first]]
    before = sample_before(sample, move)
    return if before.empty?

    later = sample_versions(sample).reject { |version| before_move?(version, move) }
    takers = taker_saves(stretches.drop(1).pluck(:reaction_id) - [stretches.first[:reaction_id]],
                         move['ts'], history.drop(stretches[1][:first]))
    restored = SAMPLE_COLUMNS.each_with_object({}) do |column, values|
      changes = later.select { |version| version['c'].key?(column) }
      next if changes.empty? || !before.key?(column)
      next notes[:kept_columns] << sample.id unless changes.all? { |version| takers.call(version) }

      values[column] = before[column]
    end
    write_sample(sample.id, restored, notes)
  end

  def write_sample(sample_id, values, notes)
    current = select_all("SELECT #{SAMPLE_COLUMNS.join(', ')} FROM samples WHERE id = #{connection.quote(sample_id)}")
              .first
    changed = values.reject { |column, value| same_value?(column, value, current[column]) }
    return if changed.empty?

    assignments = changed.map { |column, value| "#{connection.quote_column_name(column)} = #{quote_value(value)}" }
    assignments << 'updated_at = now()'
    execute("UPDATE samples SET #{assignments.join(', ')} WHERE id = #{connection.quote(sample_id)}")
    notes[:restored_samples] << sample_id
  end

  def sample_versions(sample)
    History.versions(select_value("SELECT log_data FROM samples WHERE id = #{connection.quote(sample.id)}"))
  end

  # The sample's columns before the save that wrote the given link version.
  def sample_before(sample, move)
    versions = sample_versions(sample)
    before = versions.take_while { |version| before_move?(version, move) }
    before.empty? ? {} : History.snapshot(before)
  end

  def before_move?(version, move)
    uuid = History.request_uuid(move)
    return false if uuid && History.request_uuid(version) == uuid

    version['ts'] < (uuid ? move['ts'] : move['ts'] - SAVE_WINDOW_MS)
  end

  # @return [Proc] whether a sample version was written by a save of one of the given reactions
  def taker_saves(reaction_ids, since_ts, link_versions)
    versions = link_versions + reaction_ids.flat_map do |id|
      History.versions(select_value("SELECT log_data FROM reactions WHERE id = #{connection.quote(id)}"))
             .select { |version| version['ts'] >= since_ts - SAVE_WINDOW_MS }
    end
    uuids = versions.filter_map { |version| History.request_uuid(version) }.to_set
    times = versions.pluck('ts')
    lambda do |version|
      uuid = History.request_uuid(version)
      next uuids.include?(uuid) if uuid

      times.any? { |ts| (version['ts'] - ts).abs <= SAVE_WINDOW_MS }
    end
  end

  # Reports what a returned sample still carries from its takers: analyses added after the move, and
  # memberships of a taker's collection that is not a collection of the original reaction (memberships
  # have no history, so they are only reported).
  def note_leftovers(link, sample, moved_ts, origin_id, notes)
    notes[:analyses_after_move] << sample.id if select_value(<<~SQL.squish).present?
      SELECT 1 FROM containers c
      JOIN container_hierarchies h ON h.descendant_id = c.id
      JOIN containers root ON root.id = h.ancestor_id AND root.containable_type = 'Sample'
        AND root.containable_id = #{connection.quote(sample.id)} AND root.container_type = 'root'
      WHERE c.container_type = 'analysis' AND c.created_at > to_timestamp(#{connection.quote(moved_ts)} / 1000.0)
    SQL
    notes[:taker_memberships] << sample.id if select_value(<<~SQL.squish).present?
      SELECT 1 FROM collections_samples cs
      JOIN collections_reactions taker ON taker.collection_id = cs.collection_id AND taker.deleted_at IS NULL
        AND taker.reaction_id = #{connection.quote(link['reaction_id'])}
      WHERE cs.sample_id = #{connection.quote(sample.id)} AND cs.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM collections_reactions own WHERE own.collection_id = cs.collection_id
                          AND own.deleted_at IS NULL AND own.reaction_id = #{connection.quote(origin_id)})
    SQL
  end

  def live_reaction?(id)
    select_value("SELECT 1 FROM reactions WHERE id = #{connection.quote(id)} AND deleted_at IS NULL").present?
  end

  # Whether the reaction has a live link of that type to a sample of that molecule.
  def material?(reaction_id, type, molecule_id)
    return false if molecule_id.nil?

    select_value(<<~SQL.squish).present?
      SELECT 1 FROM reactions_samples rs JOIN samples s ON s.id = rs.sample_id AND s.deleted_at IS NULL
      WHERE rs.reaction_id = #{connection.quote(reaction_id)} AND rs.type = #{connection.quote(type)}
        AND rs.deleted_at IS NULL AND s.molecule_id = #{connection.quote(molecule_id)}
    SQL
  end

  def other_live_link?(link)
    select_value(<<~SQL.squish).present?
      SELECT 1 FROM reactions_samples
      WHERE sample_id = #{connection.quote(link['sample_id'])} AND id <> #{connection.quote(link['id'])}
        AND deleted_at IS NULL
    SQL
  end

  def same_value?(column, left, right)
    type = Sample.type_for_attribute(column)
    type.cast(left) == type.cast(right)
  end

  def quote_value(value)
    connection.quote(value.is_a?(Hash) || value.is_a?(Array) ? value.to_json : value)
  end

  def report(outcomes, notes)
    REPORTS.each do |key, text|
      ids = outcomes[key]
      say "#{ids.size} moved reaction-sample link(s) #{text}#{listed(ids)}" if ids.any? || key == :returned
    end
    say "restored the columns of #{notes[:restored_samples].uniq.size} original sample(s) from before the move"
    { kept_columns: 'kept a column someone other than a taker changed after the move',
      analyses_after_move: 'have analyses added after the move (left on the original sample)',
      taker_memberships: "are still in a taker's collection that is not one of their reaction's (not changed)" }
      .each do |key, text|
        ids = notes[key].uniq
        say "#{ids.size} returned sample(s) #{text}#{listed(ids)}" if ids.any?
      end
  end

  def listed(ids)
    return '' if ids.empty?

    more = ids.size > MAX_LISTED_IDS ? ", … #{ids.size - MAX_LISTED_IDS} more" : ''
    " (ids: #{ids.first(MAX_LISTED_IDS).join(', ')}#{more})"
  end
end
# rubocop:enable Metrics/ClassLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
