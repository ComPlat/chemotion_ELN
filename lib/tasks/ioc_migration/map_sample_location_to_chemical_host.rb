#!/usr/bin/env ruby
# frozen_string_literal: true

# =============================================================================
# Sample Location → Chemical Host-Location Backfill Script
# =============================================================================
#
# For every Sample in a given Collection, this script looks at the sample's
# current `location` field (e.g. "Cabinet 3", "stored in Fridge 4 (2x)",
# "B321; R208") and — if any known location label is found anywhere within
# it — translates it into the Inventory tab's host-location fields on the
# associated Chemical record (host_building, host_room, host_cabinet,
# host_group). The match does not have to be exact: it's a "contains" match
# against LOCATION_MAP below, so "Sample kept in Cabinet 3 top shelf" still
# matches the "Cabinet 3" entry.
#
# Source: Inventory_CCP-Datenbank_Felder.xlsx (sheet "Tabelle1")
#   col A: "Sample Properties Tab" — current entry in Sample#location
#   col B: "Inventory Tab - Host location" → host_building
#   col C: "Inventory Tab - Host location" → host_room
#   col D: "Inventory Tab - Host location" → host_cabinet
#   col E: "Inventory Tab - Host group"    → host_group
#
# The Chemical record is created if the sample doesn't already have one, and
# the sample is flagged as an inventory sample (inventory_sample = true).
#
# Usage:
#   cd /home/ubuntu/app
#   MAP_COLLECTION_ID=42 rails runner lib/tasks/ioc_migration/map_sample_location_to_chemical_host.rb
#   MAP_COLLECTION_LABEL="IOC-Inventory" MAP_USER_ID=1 rails runner lib/tasks/ioc_migration/map_sample_location_to_chemical_host.rb
#
# Options (can be combined freely in one command):
#   MAP_COLLECTION_ID=42         Target collection by id
#   MAP_COLLECTION_LABEL=foo     Target collection by label (disambiguate with MAP_USER_ID if the
#                                label is shared by more than one user)
#   MAP_USER_ID=1                Scope MAP_COLLECTION_LABEL lookup to this user
#   MAP_OVERWRITE=1              Overwrite host_* fields that are already set (default: off — only fills blanks)
#   MAP_DRY_RUN=1                Dry run — no DB writes
#
# Examples:
#   MAP_COLLECTION_ID=21 rails runner lib/tasks/ioc_migration/map_sample_location_to_chemical_host.rb
#   MAP_COLLECTION_LABEL="Inventory" MAP_USER_ID=1 MAP_OVERWRITE=1 rails runner lib/tasks/ioc_migration/map_sample_location_to_chemical_host.rb
#
# =============================================================================

class MapSampleLocationToChemicalHost
  LOG_FILE = Rails.root.join('tmp', 'map_sample_location_to_chemical_host_log.json')
  HOST_KEYS = %w[host_building host_room host_cabinet host_group host_owner].freeze

  # Location mapping: current Sample#location entry → Chemical host location fields
  # Source: Inventory_CCP-Datenbank_Felder.xlsx (sheet "Tabelle1")
  LOCATION_MAP = {
    'Cabinet 1' => { host_building: 'CN 319', host_room: '400', host_cabinet: '400_1', host_group: 'ComPlat' },
    'Cabinet 2' => { host_building: 'CN 319', host_room: '400', host_cabinet: '400_2', host_group: 'ComPlat' },
    'Cabinet 3' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_3', host_group: 'ComPlat' },
    'Cabinet 4' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_4', host_group: 'ComPlat' },
    'Cabinet 5' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_5', host_group: 'ComPlat' },
    'Cabinet 6' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_6', host_group: 'ComPlat' },
    'Cabinet 7' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_7', host_group: 'ComPlat' },
    'Cabinet 8' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_8', host_group: 'ComPlat' },
    'Cabinet 9' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_9', host_group: 'ComPlat' },
    'Cabinet 10' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_10', host_group: 'ComPlat' },
    'Cabinet 11' => { host_building: 'CN 319', host_room: '416', host_cabinet: '416_11', host_group: 'ComPlat' },
    'Cabinet 12' => { host_building: 'CN 319', host_room: '416', host_cabinet: '416_12', host_group: 'ComPlat' },
    'Cabinet 13' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_13', host_group: 'ComPlat' },
    'Cabinet 14' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_14', host_group: 'ComPlat' },
    'Cabinet 15' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_15', host_group: 'ComPlat' },
    'Cabinet 16' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_16', host_group: 'ComPlat' },
    'Cabinet 17' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_17', host_group: 'ComPlat' },
    'Cabinet 18' => { host_building: 'CN 319', host_room: '400', host_cabinet: '400_18', host_group: 'ComPlat' },
    'Cabinet 19' => { host_building: 'CN 319', host_room: '400', host_cabinet: '400_19', host_group: 'ComPlat' },
    'Cabinet 20' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_20', host_group: 'ComPlat' },
    'Cabinet 21' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_21', host_group: 'ComPlat' },
    'Cabinet 22' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_22', host_group: 'ComPlat' },
    'Cabinet 23' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_23', host_group: 'ComPlat' },
    'Cabinet 24' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_24', host_group: 'ComPlat' },
    'Cabinet 25' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_25', host_group: 'ComPlat' },
    'Cabinet TSM Supertoxics' => { host_building: 'CN 319', host_room: '410', host_cabinet: 'SuperTox_Cabinet', host_group: 'ComPlat' },
    'Cabinet Harz' => { host_building: 'CN 319', host_room: '410', host_cabinet: 'Harz_Cabinet', host_group: 'ComPlat' },
    'Salzregal' => { host_building: 'CN 319', host_room: '410', host_cabinet: '410_Salzregal', host_group: 'ComPlat' },
    'Fridge 1' => { host_building: 'CN 319', host_room: '446', host_cabinet: 'Fridge_1', host_group: 'ComPlat' },
    'Fridge 2' => { host_building: 'CN 319', host_room: '446', host_cabinet: 'Fridge_2', host_group: 'ComPlat' },
    'Fridge 3' => { host_building: 'CN 319', host_room: '446', host_cabinet: 'Fridge_3', host_group: 'ComPlat' },
    'Fridge 4' => { host_building: 'CN 319', host_room: '405', host_cabinet: 'Fridge 4', host_group: 'ComPlat' },
    'Fridge 5' => { host_building: 'CN 319', host_room: '405', host_cabinet: 'Fridge 5', host_group: 'ComPlat' },
    'Fridge 6' => { host_building: 'CN 319', host_room: '410', host_cabinet: 'Fridge 6', host_group: 'ComPlat' },
    'Fridge 7' => { host_building: 'CN 319', host_room: '410', host_cabinet: 'Fridge 7', host_group: 'ComPlat' },
    'Freezer 1' => { host_building: 'CN 319', host_room: '446', host_cabinet: 'Freezer 1', host_group: 'ComPlat' },
    'Freezer 2' => { host_building: 'CN 319', host_room: '446', host_cabinet: 'Freezer 2', host_group: 'ComPlat' },
    'Freezer 3' => { host_building: 'CN 319', host_room: '405', host_cabinet: 'Freezer 3', host_group: 'ComPlat' },
    'Freezer 4' => { host_building: 'CN 319', host_room: '400', host_cabinet: 'Freezer 4', host_group: 'ComPlat' },
    'Freezer 5' => { host_building: 'CN 319', host_room: '405', host_cabinet: 'Freezer 5', host_group: 'ComPlat' },
    'Freezer 6' => { host_building: 'CN 319', host_room: '410', host_cabinet: 'Freezer 6', host_group: 'ComPlat' },
    'Freezer 7' => { host_building: 'CN 319', host_room: '410', host_cabinet: 'Freezer 7', host_group: 'ComPlat' },
    'Freezer 8' => { host_building: 'CN 319', host_room: '410', host_cabinet: 'Freezer 8', host_group: 'ComPlat' },
    'Cyclic Voltammetry' => { host_building: 'CN 319', host_room: '405', host_cabinet: '405_CV-Station', host_group: 'ComPlat' },
    'Schublade unter Waage Lab 133' => { host_building: 'CN 319', host_group: 'ComPlat' },
    'B321; R208' => { host_building: 'CN 321', host_room: '208', host_cabinet: '208_1', host_group: 'ComPlat' },
    'CS' => { host_building: 'CS 30.42', host_group: 'Bräse' },
  }.transform_values(&:freeze).freeze

  # Longest labels first, so e.g. "Cabinet 10" is tried before the more
  # generic "Cabinet 1" (word-boundary matching already prevents "Cabinet 1"
  # from falsely matching inside "Cabinet 10", but this keeps intent explicit).
  LOCATION_KEYS_BY_LENGTH = LOCATION_MAP.keys.sort_by { |k| -k.length }.freeze

  attr_reader :collection, :dry_run, :overwrite,
              :stats, :unmatched_locations, :errors, :log

  def initialize
    @dry_run = ENV['MAP_DRY_RUN'].present?
    @overwrite = ENV['MAP_OVERWRITE'].present?
    @stats = { total_samples: 0, blank_location: 0, matched: 0, unmatched: 0,
               chemicals_created: 0, chemicals_updated: 0, marked_inventory: 0, failed: 0 }
    @unmatched_locations = Hash.new(0)
    @errors = []
    @log = { started_at: Time.current, records: [] }

    setup_collection
  end

  def run
    puts header_banner
    samples = collection.samples.to_a
    @stats[:total_samples] = samples.size
    puts "📁 Collection: '#{collection.label}' (ID: #{collection.id})"
    puts "📊 Samples in collection: #{samples.size}"
    puts "🔧 Mode: #{dry_run ? 'DRY RUN (no DB writes)' : 'LIVE'} | overwrite=#{overwrite}"
    puts ''

    samples.each_with_index do |sample, idx|
      process_sample(sample)
      print_progress(idx + 1, samples.size) if ((idx + 1) % 50).zero?
    end

    print_progress(samples.size, samples.size)
    finalize
  end

  private

  # ── Setup ──────────────────────────────────────────────────────────────────

  def setup_collection
    collection_id = ENV['MAP_COLLECTION_ID']
    collection_label = ENV['MAP_COLLECTION_LABEL']
    raise 'Set MAP_COLLECTION_ID or MAP_COLLECTION_LABEL' if collection_id.blank? && collection_label.blank?

    @collection = if collection_id.present?
                    Collection.find(collection_id)
                  else
                    find_collection_by_label(collection_label)
                  end
  end

  def find_collection_by_label(label)
    scope = Collection.where(label: label)
    user_id = ENV['MAP_USER_ID']
    scope = scope.where(user_id: user_id) if user_id.present?

    matches = scope.to_a
    raise "No collection found with label '#{label}'" if matches.empty?
    if matches.size > 1
      raise "Multiple collections found with label '#{label}' " \
            "(ids: #{matches.map(&:id).join(', ')}) — disambiguate with MAP_USER_ID"
    end

    matches.first
  end

  # ── Location Mapping ───────────────────────────────────────────────────────

  def resolve_host_fields(raw_location)
    return nil if raw_location.blank?

    haystack = raw_location.to_s.gsub(/\s+/, ' ')
    key = LOCATION_KEYS_BY_LENGTH.find { |k| haystack.match?(/\b#{Regexp.escape(k)}\b/i) }
    key && LOCATION_MAP[key]
  end

  # ── Sample Processing ───────────────────────────────────────────────────────

  def process_sample(sample)
    raw_location = sample.location
    record_log = { sample_id: sample.id, location: raw_location, status: nil, error: nil }

    if raw_location.blank?
      @stats[:blank_location] += 1
      record_log[:status] = 'blank_location'
      @log[:records] << record_log
      return
    end

    host_fields = resolve_host_fields(raw_location)
    if host_fields.nil?
      @stats[:unmatched] += 1
      @unmatched_locations[raw_location] += 1
      record_log[:status] = 'unmatched_location'
      @log[:records] << record_log
      return
    end
    @stats[:matched] += 1

    if dry_run
      record_log[:status] = 'would_update'
      record_log[:host_fields] = host_fields
      @log[:records] << record_log
      return
    end

    ActiveRecord::Base.transaction do
      chemical = sample.chemical

      if chemical.nil?
        chemical = Chemical.new(sample_id: sample.id, chemical_data: [{}])
        @stats[:chemicals_created] += 1
      else
        @stats[:chemicals_updated] += 1
      end

      applied = apply_host_fields(chemical, host_fields)
      chemical.save!

      unless sample.inventory_sample?
        sample.update!(inventory_sample: true)
        @stats[:marked_inventory] += 1
      end

      record_log[:status] = 'updated'
      record_log[:chemical_id] = chemical.id
      record_log[:applied_fields] = applied
      @log[:records] << record_log
    end
  rescue StandardError => e
    @stats[:failed] += 1
    record_log[:status] = 'failed'
    record_log[:error] = e.message
    @errors << { sample_id: sample.id, location: raw_location, error: e.message }
    @log[:records] << record_log
  end

  def apply_host_fields(chemical, host_fields)
    data = (chemical.chemical_data.presence || [{}]).dup
    entry = (data[0] || {}).dup
    applied = {}

    HOST_KEYS.each do |key|
      value = host_fields[key.to_sym]
      next if value.blank?
      next if entry[key].present? && !overwrite

      entry[key] = value
      applied[key] = value
    end

    data[0] = entry
    chemical.chemical_data = data
    applied
  end

  # ── Utilities ──────────────────────────────────────────────────────────────

  def print_progress(current, total)
    pct = (current.to_f / total * 100).round(1)
    puts "   [#{current}/#{total}] #{pct}% — ✅ #{@stats[:matched]} matched, " \
         "❓ #{@stats[:unmatched]} unmatched, ❌ #{@stats[:failed]} failed"
  end

  def header_banner
    <<~BANNER

      ╔══════════════════════════════════════════════════════════════╗
      ║   Sample Location → Chemical Host-Location Backfill        ║
      ╚══════════════════════════════════════════════════════════════╝

    BANNER
  end

  def finalize
    @log[:finished_at] = Time.current
    @log[:stats] = @stats
    @log[:unmatched_locations] = @unmatched_locations
    @log[:errors_summary] = @errors.first(100)

    File.write(LOG_FILE, JSON.pretty_generate(@log))

    puts ''
    puts '=' * 60
    puts '📊 MAPPING COMPLETE'
    puts '=' * 60
    puts "   Total samples:          #{@stats[:total_samples]}"
    puts "   ⏭️  Blank location:      #{@stats[:blank_location]}"
    puts "   ✅ Matched:              #{@stats[:matched]}"
    puts "   ❓ Unmatched:            #{@stats[:unmatched]}"
    puts "   🧪 Chemicals created:   #{@stats[:chemicals_created]}"
    puts "   🔄 Chemicals updated:   #{@stats[:chemicals_updated]}"
    puts "   🏷️  Marked inventory:    #{@stats[:marked_inventory]}"
    puts "   ❌ Failed:               #{@stats[:failed]}"
    puts "   📝 Log file:            #{LOG_FILE}"
    puts '=' * 60

    if @unmatched_locations.any?
      puts "\n❓ Unmatched location values (add these to LOCATION_MAP if needed):"
      @unmatched_locations.sort_by { |_, count| -count }.first(20).each do |loc, count|
        puts "   #{loc.inspect} (#{count}x)"
      end
    end

    return unless @errors.any?

    puts "\n⚠️  First 10 errors:"
    @errors.first(10).each do |err|
      puts "   Sample##{err[:sample_id]} (location: #{err[:location]}): #{err[:error]}"
    end
  end
end

# ── Run ────────────────────────────────────────────────────────────────────────
MapSampleLocationToChemicalHost.new.run
