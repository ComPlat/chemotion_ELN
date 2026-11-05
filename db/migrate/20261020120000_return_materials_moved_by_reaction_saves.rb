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
# id. A link is skipped when its original reaction is deleted or got that material again after the
# move, when its sample is deleted, or when its history changes the sample.
# rubocop:disable Metrics/ClassLength, Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity -- one-off data repair kept in one migration
class ReturnMaterialsMovedByReactionSaves < ActiveRecord::Migration[6.1]
  History = ReactionsSampleHistory

  # columns of a link that a reaction save writes, and that are restored from its history
  LINK_COLUMNS = %w[
    type reference equivalent position waste coefficient show_label gas_type gas_phase_data
    conversion_rate weight_percentage weight_percentage_reference
  ].freeze
  # link columns added after the history backfill: older snapshots lack them, so restore the defaults
  LATER_LINK_COLUMNS = { 'weight_percentage' => nil, 'weight_percentage_reference' => false }.freeze
  # flags a reaction holds on one material only
  SINGLE_FLAGS = %w[reference weight_percentage_reference].freeze
  # sample columns a reaction save wrote to an existing sample (UpdateMaterials#update_existing_sample)
  SAMPLE_COLUMNS = %w[
    target_amount_value target_amount_unit real_amount_value real_amount_unit metrics
    name short_label external_label solvent dry_solvent
  ].freeze
  # what a split takes from the sample of the time it left a reaction (it keeps its own label)
  SPLIT_COLUMNS = (SAMPLE_COLUMNS - %w[short_label]).freeze
  # without request metadata, versions written this close to a reaction save belong to that save
  SAVE_WINDOW_MS = 5_000
  # ids listed per reported outcome
  MAX_LISTED_IDS = 200
  REPORTS = {
    returned: 'returned to their original reaction',
    revived: 'revived (soft-deleted with their copy) and returned to their original reaction',
    origin_has_it: 'skipped: the original reaction got a material of that molecule in that role after the move',
    origin_gone: 'skipped: the original reaction is deleted',
    sample_gone: 'skipped: the sample is deleted',
    sample_elsewhere: 'skipped: soft-deleted with its copy, and its sample has another live link now',
    sample_changed: 'skipped: the history changes the sample',
    no_history: 'skipped: the history names no first reaction',
    failed: 'failed and left unchanged',
  }.freeze
  NOTES = {
    kept_columns: 'kept a column someone other than a taker changed after the move',
    analyses_after_move: 'have analyses added after the move (left on the original sample)',
    other_data_after_move: 'have residues, components or segments changed after the move (left as they are)',
    origin_variations: 'have no entry in the variations of their original reaction (dropped after the move)',
    taker_memberships: "are still in a taker's collection that is not one of their reaction's (not changed)",
  }.freeze

  def up
    @started_at = select_value('SELECT clock_timestamp()')
    outcomes = Hash.new { |hash, key| hash[key] = [] }
    notes = Hash.new { |hash, key| hash[key] = [] }
    moved_links.each do |link|
      link_notes = Hash.new { |hash, key| hash[key] = [] }
      outcome = ActiveRecord::Base.transaction(requires_new: true) { repair(link, link_notes) }
      outcomes[outcome] << link['id']
      link_notes.each { |key, ids| notes[key].concat(ids) }
    rescue StandardError => e
      outcomes[:failed] << "#{link['id']} (#{e.class}: #{e.message.to_s.lines.first&.strip&.slice(0, 120)})"
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
  # @param notes [Hash{Symbol => Array}] collects findings to report (sample ids), kept only on success
  # @return [Symbol] the outcome, a key of {REPORTS}
  def repair(link, notes)
    history = History.versions(link['log_data'])
    stretches = History.reaction_stretches(history)
    skip = skip_reason(link, history, stretches)
    return skip if skip

    sample = Sample.find(link['sample_id'])
    sample_history = sample_versions(sample.id)
    origin_id = stretches.first[:reaction_id]
    new_sample_ids = give_takers_samples(link, sample, history, stretches, sample_history)
    restore_link(link['id'], origin_id, origin_snapshot(history, stretches))
    refresh_tags([sample.id, *new_sample_ids])
    restore_sample(sample, history, stretches, sample_history, notes)
    note_leftovers(link, sample, history, stretches, notes)
    link['live'] ? :returned : :revived
  end

  def skip_reason(link, history, stretches)
    return :no_history if stretches.size < 2 || link['type'].nil?
    return :sample_changed if history.drop(1).any? { |version| version['c'].key?('sample_id') }
    return :sample_gone unless link['sample_live']

    origin_id = stretches.first[:reaction_id]
    return :origin_gone unless live_reaction?(origin_id)

    origin_type = origin_snapshot(history, stretches)['type']
    return :origin_has_it if readded?(origin_id, origin_type, link, history[stretches[1][:first]]['ts'])

    :sample_elsewhere if !link['live'] && other_live_link?(link)
  end

  # The link as it was at the end of its last stretch in the original reaction (a chain can pass
  # through the original again).
  def origin_snapshot(history, stretches)
    origin_id = stretches.first[:reaction_id]
    last_in_origin = stretches.reverse.find { |stretch| stretch[:reaction_id] == origin_id }
    with_later_defaults(History.snapshot(history[0..last_in_origin[:last]]))
  end

  # The current holder (when its link is live) and every reaction the link passed through get a sample
  # of their own, unless they got that material again after it left or are deleted.
  #
  # @return [Array<Integer>] the ids of the new samples
  def give_takers_samples(link, sample, history, stretches, sample_history)
    origin_id = stretches.first[:reaction_id]
    holder_id = link['live'] ? link['reaction_id'] : nil
    new_ids = []
    new_ids << give_sample(holder_id, sample, current_link_values(link['id']), nil, link['id']) if holder_id
    stretches.each_with_index.drop(1).reverse_each.uniq { |stretch, _| stretch[:reaction_id] }.each do |stretch, index|
      reaction_id = stretch[:reaction_id]
      next if [origin_id, holder_id].include?(reaction_id) || index == stretches.size - 1
      next unless live_reaction?(reaction_id)

      values = with_later_defaults(History.snapshot(history[0..stretch[:last]]))
      left_at = history[stretches[index + 1][:first]]
      next if readded?(reaction_id, values['type'], link, left_at['ts'])

      new_ids << give_sample(reaction_id, sample, values, sample_before(sample_history, left_at), link['id'])
    end
    new_ids
  end

  # Links the reaction to a new sample split from +sample+.
  #
  # @param values [Hash] the link values in that reaction
  # @param columns [Hash, nil] sample columns of the time the material left that reaction; nil keeps the
  #   sample's current columns
  # @param moved_id [Integer] the moved link, ignored when checking the reaction's single flags
  # @return [Integer] the id of the new sample
  def give_sample(reaction_id, sample, values, columns, moved_id)
    reaction = Reaction.find(reaction_id)
    new_sample = new_sample_for(reaction, sample, values['type'])
    taken = columns&.slice(*SPLIT_COLUMNS)
    new_sample.update_columns(taken) if taken.present? # rubocop:disable Rails/SkipsModelValidations
    create_link(reaction_id, new_sample.id, guard_single_flags(reaction_id, values.slice(*LINK_COLUMNS), moved_id))
    rekey_variations(reaction, values['type'], sample.id, new_sample.id)
    new_sample.id
  end

  def new_sample_for(reaction, sample, type)
    user = new_sample_owner(reaction, sample)
    raise ActiveRecord::RecordNotFound, "no live user to own a sample of reaction #{reaction.id}" unless user

    new_sample = sample.create_subsample(user, reaction.collections.pluck(:id), true, 'reaction')
    # a product is a new sample, not a split (as the reaction editor creates it)
    new_sample.update!(parent: nil, short_label: nil) if type == 'ReactionsProductSample'
    new_sample
  end

  # The owner of a new sample: the reaction's creator, else the sample's, else the owner of one of the
  # reaction's collections. A sample's creator must be a live user.
  #
  # @return [User, nil] nil when none of them is a live user
  def new_sample_owner(reaction, sample)
    User.find_by(id: reaction.created_by) || User.find_by(id: sample.created_by) ||
      User.find_by(id: reaction.collections.where.not(user_id: nil).select(:user_id))
  end

  def current_link_values(link_id)
    select_all("SELECT #{LINK_COLUMNS.join(', ')} FROM reactions_samples WHERE id = #{connection.quote(link_id)}")
      .first
  end

  # Creates the link through its model, so the link callbacks (element tag, collections) run.
  def create_link(reaction_id, sample_id, values)
    attributes = values.to_h do |column, value|
      [column, History::JSONB_COLUMNS.include?(column) ? History.parse_json(value) : value]
    end
    attributes.delete('type').constantize.create!(attributes.merge('reaction_id' => reaction_id,
                                                                   'sample_id' => sample_id))
  end

  def restore_link(id, origin_id, snapshot)
    values = guard_single_flags(origin_id, snapshot.slice(*LINK_COLUMNS), id)
    assignments = values.map { |column, value| "#{connection.quote_column_name(column)} = #{quote_value(value)}" }
    assignments << "reaction_id = #{connection.quote(origin_id)}" << 'deleted_at = NULL' << 'updated_at = now()'
    execute("UPDATE reactions_samples SET #{assignments.join(', ')} WHERE id = #{connection.quote(id)}")
  end

  # Fills the link columns an old snapshot lacks with their defaults.
  def with_later_defaults(snapshot)
    LATER_LINK_COLUMNS.merge(snapshot)
  end

  # Points the samples' element tags at the reaction of their live link (raw updates skip the callbacks).
  def refresh_tags(sample_ids)
    ReactionsSample.where(sample_id: sample_ids).find_each { |link| link.update_tag if link.respond_to?(:update_tag) }
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
    group = variations_group(type)
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

  def variations_group(type)
    material_group = type.delete_prefix('Reactions').delete_suffix('Sample').underscore
    ReactionVariationMaterialKeys.variations_group_for(material_group)
  end

  # Sets the sample's columns back to their values when the link last left the original reaction, where
  # every later change of the column came from a save of a reaction that took it.
  def restore_sample(sample, history, stretches, sample_history, notes)
    origin_id = stretches.first[:reaction_id]
    last_in_origin = stretches.rindex { |stretch| stretch[:reaction_id] == origin_id }
    taker_stretches = stretches.drop(last_in_origin + 1)
    move = history[taker_stretches.first[:first]]
    before = sample_before(sample_history, move)
    return if before.empty?

    later = sample_history.reject { |version| before_move?(version, move) }
    changed = SAMPLE_COLUMNS.select { |column| before.key?(column) && later.any? { |v| v['c'].key?(column) } }
    return if changed.empty?

    takers = taker_saves(history, taker_stretches)
    restored = changed.each_with_object({}) do |column, values|
      next notes[:kept_columns] << sample.id unless later.select { |v| v['c'].key?(column) }.all?(&takers)

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

  def sample_versions(sample_id)
    History.versions(select_value("SELECT log_data FROM samples WHERE id = #{connection.quote(sample_id)}"))
  end

  # The sample's columns before the save that wrote the given link version.
  #
  # @return [Hash] empty when the sample's history starts later
  def sample_before(sample_history, move)
    before = sample_history.take_while { |version| before_move?(version, move) }
    before.empty? ? {} : History.snapshot(before)
  end

  def before_move?(version, move)
    uuid = History.request_uuid(move)
    return false if uuid && History.request_uuid(version) == uuid

    version['ts'] < (uuid ? move['ts'] : move['ts'] - SAVE_WINDOW_MS)
  end

  # Builds the test of whether a sample version was written by a save of a reaction that took the
  # link: same request as one of the link's versions in a taker's stretch or as a version of a taker
  # reaction since the link left the original, or (without request metadata) written within
  # {SAVE_WINDOW_MS} of one.
  #
  # @param taker_stretches [Array<Hash>] the stretches after the link last left the original reaction
  # @return [Proc] called with a sample version
  def taker_saves(history, taker_stretches)
    since_ts = history[taker_stretches.first[:first]]['ts']
    versions = taker_stretches.flat_map { |stretch| history[stretch[:first]..stretch[:last]] }
    taker_stretches.map { |stretch| stretch[:reaction_id] }.uniq.each do |id|
      versions += History.versions(select_value("SELECT log_data FROM reactions WHERE id = #{connection.quote(id)}"))
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

  # Reports what a returned sample still carries from its takers, and a returned material missing from
  # its original reaction's variations: none of this is changed.
  def note_leftovers(link, sample, history, stretches, notes)
    moved_at = "to_timestamp(#{connection.quote(history[stretches[1][:first]]['ts'])} / 1000.0)"
    origin_id = stretches.first[:reaction_id]
    id = connection.quote(sample.id)
    notes[:analyses_after_move] << sample.id if select_value(<<~SQL.squish).present?
      SELECT 1 FROM containers c
      JOIN container_hierarchies h ON h.descendant_id = c.id
      JOIN containers root ON root.id = h.ancestor_id AND root.containable_type = 'Sample'
        AND root.containable_id = #{id} AND root.container_type = 'root'
      WHERE c.container_type = 'analysis' AND c.created_at > #{moved_at}
    SQL
    notes[:other_data_after_move] << sample.id if select_value(<<~SQL.squish).present?
      SELECT 1 FROM residues WHERE sample_id = #{id} AND updated_at > #{moved_at}
      UNION ALL SELECT 1 FROM components WHERE sample_id = #{id} AND updated_at > #{moved_at}
      UNION ALL SELECT 1 FROM segments WHERE element_type = 'Sample' AND element_id = #{id} AND updated_at > #{moved_at}
    SQL
    notes[:taker_memberships] << sample.id if select_value(<<~SQL.squish).present?
      SELECT 1 FROM collections_samples cs
      JOIN collections_reactions taker ON taker.collection_id = cs.collection_id AND taker.deleted_at IS NULL
        AND taker.reaction_id = #{connection.quote(link['reaction_id'])}
      WHERE cs.sample_id = #{id} AND cs.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM collections_reactions own WHERE own.collection_id = cs.collection_id
                          AND own.deleted_at IS NULL AND own.reaction_id = #{connection.quote(origin_id)})
    SQL
    origin_type = origin_snapshot(history, stretches)['type']
    notes[:origin_variations] << sample.id if variation_entry_missing?(origin_id, origin_type, sample.id)
  end

  # Whether the reaction has variations for the material's group, but none of them names the sample.
  def variation_entry_missing?(reaction_id, type, sample_id)
    group = variations_group(type)
    raw = Reaction.find(reaction_id)[:variations]
    return false if group.nil? || raw.blank?

    variations = raw.is_a?(Hash) ? raw.values : Array(raw)
    variations.none? do |variation|
      variation.is_a?(Hash) && variation[group].is_a?(Hash) && variation[group].key?(sample_id.to_s)
    end
  end

  def live_reaction?(id)
    select_value("SELECT 1 FROM reactions WHERE id = #{connection.quote(id)} AND deleted_at IS NULL").present?
  end

  # Whether the reaction got a material of the link's molecule in that role after +since_ts+: a live
  # link created then (not by this migration) whose own history starts in that reaction, so neither a
  # material it always had nor a link this run returned to it.
  def readded?(reaction_id, type, link, since_ts)
    return false if link['molecule_id'].nil? || type.nil?

    select_value(<<~SQL.squish).present?
      SELECT 1 FROM reactions_samples rs JOIN samples s ON s.id = rs.sample_id AND s.deleted_at IS NULL
      WHERE rs.reaction_id = #{connection.quote(reaction_id)} AND rs.type = #{connection.quote(type)}
        AND rs.deleted_at IS NULL AND rs.id <> #{connection.quote(link['id'])}
        AND s.molecule_id = #{connection.quote(link['molecule_id'])}
        AND rs.created_at > to_timestamp(#{connection.quote(since_ts)} / 1000.0)
        AND rs.created_at < #{connection.quote(@started_at)}
        AND coalesce((rs.log_data #>> '{h,0,c,reaction_id}')::integer, rs.reaction_id) = rs.reaction_id
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
    return History.parse_json(left) == History.parse_json(right) if %i[jsonb json].include?(type.type)

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
    NOTES.each do |key, text|
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
