#!/usr/bin/env ruby
# frozen_string_literal: true

# =============================================================================
# Cynora Chemicals → Chemotion ELN Import Script
# =============================================================================
#
# This script imports chemical inventory data from
# Cynora_Chemikalien_2026_für_Import.xlsx into the Chemotion ELN database.
#
# The XLSX follows the standard Chemotion chemical import template
# (sheet: sample_chemicals) but lacks molfile/SMILES columns. This script
# resolves molecules via CAS number lookup (CAS API → PubChem fallback),
# then uses the existing Import::ImportChemicals logic to build Chemical
# records from the remaining columns.
#
# What it does:
#   1. Creates a "Cynora-Inventory" collection for the specified user
#   2. Reads all rows from the XLSX file
#   3. For each row with a CAS number:
#      a. Looks up the molecule via CAS → SMILES → Molecule
#      b. Creates a Sample with mapped fields (name, location, amount, etc.)
#      c. Creates a Chemical record using Import::ImportChemicals logic
#   4. Rows without CAS or with failed lookups become decoupled samples
#   5. Logs all results to tmp/cynora_import_log.json
#
# Usage:
#   cd /home/ubuntu/app
#   RAILS_ENV=development rails runner lib/tasks/ioc_migration/import_cynora_chemicals.rb
#
# Options (can be combined freely in one command):
#   CYNORA_USER_ID=1            Use a specific user (default: first Person)
#   CYNORA_COLLECTION_ID=42     Import into an existing collection (default: creates 'Cynora-Inventory')
#   CYNORA_DRY_RUN=1            Dry run — no DB writes
#
# Examples:
#   CYNORA_USER_ID=1 CYNORA_COLLECTION_ID=42 rails runner lib/tasks/ioc_migration/import_cynora_chemicals.rb
#   CYNORA_USER_ID=1 CYNORA_DRY_RUN=1 rails runner lib/tasks/ioc_migration/import_cynora_chemicals.rb
#   CYNORA_USER_ID=1 CYNORA_COLLECTION_ID=42 CYNORA_DRY_RUN=1 rails runner lib/tasks/ioc_migration/import_cynora_chemicals.rb
#
# =============================================================================

require 'roo'

class CynoraMigration
  COLLECTION_LABEL = 'Cynora-Inventory'
  XLSX_FILE = Rails.root.join('lib', 'tasks', 'ioc_migration', 'Cynora_Chemikalien_2026_für_Import_01.xlsx')
  LOG_FILE = Rails.root.join('tmp', 'cynora_import_log.json')

  # Rate limiting for external API calls (seconds between calls)
  API_DELAY = 0.3

  # Column indices (1-based) in the XLSX — derived from the header row
  # We read by header name, not by index.
  SAMPLE_FIELD_MAP = {
    'sample name'              => :name,
    'sample external label'    => :external_label,
    'molecule name'            => :molecule_name,
    'location'                 => :location,
    'target amount'            => :target_amount_value,
    'target unit'              => :target_amount_unit,
    'density'                  => :density,
    'purity'                   => :purity,
    'molarity'                 => :molarity_value,
    'description'              => :description,
    'melting pt'               => :melting_point,
    'boiling pt'               => :boiling_point,
    'solvent'                  => :solvent,
    'dry solvent'              => :dry_solvent,
    'secret'                   => :is_top_secret,
    'decoupled'                => :decoupled,
  }.freeze

  XREF_FIELDS = %w[
    cas refractive_index form color solubility inventory_label flash_point
  ].freeze

  attr_reader :user, :collection, :all_collection, :dry_run,
              :stats, :errors, :log

  def initialize
    @dry_run = ENV['CYNORA_DRY_RUN'].present?
    @stats = { total_rows: 0, total: 0, created: 0, decoupled: 0, skipped: 0, failed: 0, chemicals_created: 0 }
    @errors = []
    @log = { started_at: Time.current, records: [] }

    setup_user
    setup_collections unless @dry_run
  end

  def run
    puts header_banner
    rows = read_xlsx
    @stats[:total_rows] = rows.size
    puts "📊 Data rows read: #{rows.size}"
    puts "🔧 Mode: #{@dry_run ? 'DRY RUN (no DB writes)' : 'LIVE'}"
    puts ''

    rows.each_with_index do |row, idx|
      process_row(row, idx)
      print_progress(idx + 1, rows.size) if ((idx + 1) % 50).zero?
    end

    print_progress(rows.size, rows.size)
    finalize
  end

  private

  # ── Setup ──────────────────────────────────────────────────────────────────

  def setup_user
    user_id = ENV['CYNORA_USER_ID']
    @user = if user_id
              User.find(user_id)
            else
              Person.first
            end
    raise 'No user found! Set CYNORA_USER_ID env variable.' unless @user

    puts "👤 Using user: #{@user.name} (ID: #{@user.id})"
  end

  def setup_collections
    @all_collection = Collection.get_all_collection_for_user(@user.id)
    raise "No 'All' collection found for user #{@user.id}" unless @all_collection

    collection_id = ENV['CYNORA_COLLECTION_ID']
    @collection = if collection_id
                    col = Collection.find(collection_id)
                    raise "Collection #{collection_id} does not belong to user #{@user.id}" unless col.user_id == @user.id

                    col
                  else
                    Collection.find_or_create_by(
                      user_id: @user.id,
                      label: COLLECTION_LABEL
                    ) do |c|
                      c.is_locked = false
                      c.is_shared = false
                    end
                  end
    puts "📁 Collection: '#{@collection.label}' (ID: #{@collection.id})"
  end

  # ── XLSX Reading ───────────────────────────────────────────────────────────

  def read_xlsx
    puts "📄 Reading XLSX file: #{XLSX_FILE}"
    xlsx = Roo::Excelx.new(XLSX_FILE.to_s)
    sheet = if xlsx.sheets.include?('sample_chemicals')
              xlsx.sheet('sample_chemicals')
            else
              xlsx.sheet(0)
            end

    header = sheet.row(1).map { |h| h&.to_s&.strip&.downcase }
    puts "   Headers: #{header.compact.size} columns"
    puts "   Data rows: #{sheet.last_row - 1}"

    rows = []
    (2..sheet.last_row).each do |row_idx|
      raw = sheet.row(row_idx)
      row_hash = {}
      header.each_with_index do |col_name, col_idx|
        next if col_name.blank?

        val = raw[col_idx]
        row_hash[col_name] = val.is_a?(String) ? val.strip : val
      end
      # Skip completely empty rows
      rows << row_hash if row_hash.values.any?(&:present?)
    end
    rows
  end

  # ── Row Processing ─────────────────────────────────────────────────────────

  def process_row(row, idx)
    @stats[:total] += 1
    cas_nr = clean_cas(row['cas'])
    label = row['sample external label'] || "row_#{idx + 2}"

    record_log = {
      row_index: idx + 2,
      cas: cas_nr,
      external_label: label,
      status: nil,
      sample_id: nil,
      error: nil,
    }

    if @dry_run
      record_log[:status] = cas_nr.present? ? 'would_create' : 'would_create_decoupled'
      @stats[cas_nr.present? ? :created : :decoupled] += 1
      @log[:records] << record_log
      return
    end

    ActiveRecord::Base.transaction do
      sample = if cas_nr.present?
                 create_sample_from_cas(row, cas_nr, label)
               else
                 create_decoupled_sample(row, label)
               end

      if sample&.persisted?
        create_chemical(sample, row)
        record_log[:status] = sample.decoupled? ? 'created_decoupled' : 'created'
        record_log[:sample_id] = sample.id
        @stats[sample.decoupled? ? :decoupled : :created] += 1
      else
        record_log[:status] = 'failed'
        record_log[:error] = sample&.errors&.full_messages&.join(', ') || 'Unknown error'
        @stats[:failed] += 1
      end
    rescue StandardError => e
      record_log[:status] = 'failed'
      record_log[:error] = e.message
      @stats[:failed] += 1
      @errors << { row: idx + 2, cas: cas_nr, label: label, error: e.message }
    end

    @log[:records] << record_log
  end

  # ── Sample Creation ────────────────────────────────────────────────────────

  def create_sample_from_cas(row, cas_nr, label)
    molecule = find_or_create_molecule_by_cas(cas_nr)

    if molecule.nil?
      puts "\n   ⚠️  CAS lookup failed for #{cas_nr} (#{label}), creating decoupled sample"
      return create_decoupled_sample(row, label)
    end

    sample = Sample.new(
      created_by: @user.id,
      molecule_id: molecule.id,
      molfile: molecule.molfile,
      inventory_sample: true,
    )

    apply_sample_fields(sample, row)
    sample.xref['cas'] = cas_nr

    sample.collections << @collection
    sample.collections << @all_collection
    sample.save!
    sample
  end

  def create_decoupled_sample(row, _label)
    dummy = Molecule.find_or_create_dummy
    cas_nr = clean_cas(row['cas'])

    sample = Sample.new(
      created_by: @user.id,
      molecule_id: dummy.id,
      decoupled: true,
      inventory_sample: true,
    )

    apply_sample_fields(sample, row)
    sample.xref['cas'] = cas_nr if cas_nr.present?

    sample.collections << @collection
    sample.collections << @all_collection
    sample.save!
    sample
  end

  def apply_sample_fields(sample, row)
    # Name
    sample.name = row['sample name'].to_s if row['sample name'].present?

    # External label
    sample.external_label = row['sample external label'].to_s if row['sample external label'].present?

    # Location
    sample.location = row['location'].to_s if row['location'].present?

    # Target amount
    if row['target amount (packungsgröße)'].present?
      sample.target_amount_value = row['target amount (packungsgröße)'].to_f
    end
    sample.target_amount_unit = row['target unit'].to_s if row['target unit'].present?

    # Density
    sample.density = row['density'].to_f if row['density'].present?

    # Description
    sample.description = row['description'].to_s if row['description'].present?

    # Melting / Boiling point
    sample.melting_point = format_to_interval(row['melting pt']) if row['melting pt'].present?
    sample.boiling_point = format_to_interval(row['boiling pt']) if row['boiling pt'].present?

    # Top secret / dry solvent
    sample.is_top_secret = to_bool(row['secret']) if row.key?('secret')
    sample.dry_solvent = to_bool(row['dry solvent']) if row.key?('dry solvent')

    # xref fields
    apply_xref_fields(sample, row)
  end

  def apply_xref_fields(sample, row)
    # Refractive index
    sample.xref['refractive_index'] = row['refractive index'].to_s if row['refractive index'].present?

    # Form
    sample.xref['form'] = row['form'].to_s if row['form'].present?

    # Color
    sample.xref['color'] = row['color'].to_s if row['color'].present?

    # Solubility
    sample.xref['solubility'] = row['solubility'].to_s if row['solubility'].present?

    # Inventory label
    sample.xref['inventory_label'] = row['inventory label'].to_s if row['inventory label'].present?

    # Flash point
    if row['flash point'].present?
      fp_parsed = parse_flash_point(row['flash point'].to_s)
      sample.xref['flash_point'] = fp_parsed if fp_parsed
    end
  end

  # ── Molecule Lookup (CAS → SMILES → Molecule) ─────────────────────────────

  def find_or_create_molecule_by_cas(cas_nr)
    @molecule_cache ||= {}
    return @molecule_cache[cas_nr] if @molecule_cache.key?(cas_nr)

    begin
      result = Chemotion::CasLookupService.fetch_by_cas(cas_nr)
      smiles = result[:smiles]

      if smiles.present?
        molecule = Molecule.find_or_create_by_cano_smiles(smiles)
        @molecule_cache[cas_nr] = molecule
        sleep(API_DELAY)
        return molecule
      end
    rescue StandardError => e
      Rails.logger.warn "CAS lookup failed for #{cas_nr}: #{e.message}"
    end

    @molecule_cache[cas_nr] = nil
    nil
  end

  # ── Chemical Creation (uses Import::ImportChemicals logic) ─────────────────

  def create_chemical(sample, row)
    # Build header array matching the row keys that correspond to chemical fields
    chemical_header = Import::ImportChemicals::CHEMICAL_FIELDS.select do |field|
      key = field.downcase.gsub(/\s+/, ' ')
      row.keys.any? { |k| normalize_header(k) == normalize_header(key) }
    end

    # Build a row hash keyed by the normalized header names
    chemical_row = {}
    row.each do |k, v|
      chemical_header.each do |ch|
        if normalize_header(k) == normalize_header(ch)
          chemical_row[ch] = v.is_a?(Numeric) ? v.to_s : v&.to_s
        end
      end
    end

    chemical = Import::ImportChemicals.build_chemical(chemical_row, chemical_header)
    chemical.sample_id = sample.id
    chemical.save!
    @stats[:chemicals_created] += 1
    chemical
  end

  def normalize_header(h)
    h.to_s.downcase.strip.gsub(/\s+/, '_')
  end

  # ── Utilities ──────────────────────────────────────────────────────────────

  def clean_cas(cas_val)
    return nil if cas_val.blank?

    cleaned = cas_val.to_s.strip
    cleaned.match?(/^\d+-\d+-\d+$/) ? cleaned : nil
  end

  def to_bool(value)
    return false if value.nil?

    if value.is_a?(String)
      return value.casecmp('yes').zero? || value == '1' || value.casecmp('true').zero?
    end

    !!value
  end

  def format_to_interval(value)
    return "[#{-Float::INFINITY}, #{Float::INFINITY}]" if value.nil?

    str = value.to_s
    matches = str.scan(/^(-?\d+(?:[.,]\d+)?)(?:\s*-\s*(-?\d+(?:[.,]\d+)?))?$/).flatten.compact
    return "[#{-Float::INFINITY}, #{Float::INFINITY}]" if matches.empty?

    numbers = matches.filter_map(&:to_f)
    lower, upper = numbers.size == 1 ? [numbers[0], Float::INFINITY] : numbers
    "[#{lower}, #{upper}]"
  end

  def parse_flash_point(value)
    num = value.scan(/[-+]?\d+(?:\.\d+)?/).first&.to_f
    unit = value.match(/°C|°F|K/)&.to_s
    return nil unless num && unit

    { 'value' => num, 'unit' => unit }
  end

  def print_progress(current, total)
    pct = (current.to_f / total * 100).round(1)
    puts "   [#{current}/#{total}] #{pct}% — ✅ #{@stats[:created]} created, " \
         "🔗 #{@stats[:decoupled]} decoupled, ❌ #{@stats[:failed]} failed"
  end

  def header_banner
    <<~BANNER

      ╔══════════════════════════════════════════════════════════════╗
      ║     Cynora Chemicals → Chemotion ELN Import                ║
      ╚══════════════════════════════════════════════════════════════╝

    BANNER
  end

  def finalize
    @log[:finished_at] = Time.current
    @log[:stats] = @stats
    @log[:errors_summary] = @errors.first(100)

    File.write(LOG_FILE, JSON.pretty_generate(@log))

    puts ''
    puts '=' * 60
    puts '📊 IMPORT COMPLETE'
    puts '=' * 60
    puts "   XLSX rows:              #{@stats[:total_rows]}"
    puts "   Total samples:          #{@stats[:total]}"
    puts "   ✅ Created (with mol):  #{@stats[:created]}"
    puts "   🔗 Decoupled (no mol):  #{@stats[:decoupled]}"
    puts "   ⏭️  Skipped:             #{@stats[:skipped]}"
    puts "   ❌ Failed:              #{@stats[:failed]}"
    puts "   🧪 Chemicals created:   #{@stats[:chemicals_created]}"
    puts "   📝 Log file:           #{LOG_FILE}"
    puts '=' * 60

    if @errors.any?
      puts "\n⚠️  First 10 errors:"
      @errors.first(10).each do |err|
        puts "   Row #{err[:row]} (CAS: #{err[:cas]}): #{err[:error]}"
      end
    end
  end
end

# ── Run ────────────────────────────────────────────────────────────────────────
CynoraMigration.new.run
