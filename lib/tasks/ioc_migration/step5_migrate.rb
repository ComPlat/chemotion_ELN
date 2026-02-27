#!/usr/bin/env ruby
# frozen_string_literal: true

# =============================================================================
# IOC Database → Chemotion ELN Migration Script
# =============================================================================
#
# This script imports chemical inventory data from SDFile_IOC-Database_20251219.sdf
# into the Chemotion ELN database.
#
# What it does:
#   1. Creates an "IOC-Inventory" collection for the specified user
#   2. Parses all records from the IOC SDF file
#   3. For each record with a CAS number:
#      a. Looks up the molecule via CAS → SMILES → Molecule
#      b. Creates a Sample with mapped fields (name, location, amount, etc.)
#      c. Creates a Chemical record with vendor, price, safety data, etc.
#   4. Records without CAS or with failed lookups become decoupled samples
#   5. Logs all results to tmp/ioc_migration_log.json
#
# Usage:
#   cd /home/ubuntu/app
#   RAILS_ENV=development rails runner lib/tasks/ioc_migration/step5_migrate.rb
#
# To specify a user (default: first admin):
#   IOC_USER_ID=1 rails runner lib/tasks/ioc_migration/step5_migrate.rb
#
# Dry run (no DB writes):
#   IOC_DRY_RUN=1 rails runner lib/tasks/ioc_migration/step5_migrate.rb
#
# =============================================================================

class IocMigration
  COLLECTION_LABEL = 'IOC-Inventory'
  SDF_FILE = Rails.root.join('SDFile_IOC-Database_20251219.sdf')
  LOG_FILE = Rails.root.join('tmp', 'ioc_migration_log.json')
  BATCH_SIZE = 50
  # Rate limiting for external API calls (seconds between calls)
  API_DELAY = 0.3

  attr_reader :user, :collection, :all_collection, :dry_run,
              :stats, :errors, :log

  def initialize
    @dry_run = ENV['IOC_DRY_RUN'].present?
    @stats = { total: 0, created: 0, decoupled: 0, skipped: 0, failed: 0, chemicals_created: 0 }
    @errors = []
    @log = { started_at: Time.current, records: [] }

    setup_user
    setup_collections unless @dry_run
  end

  def run
    puts header_banner
    records = parse_sdf_file
    @stats[:total] = records.size
    puts "📊 Total records to process: #{records.size}"
    puts "🔧 Mode: #{@dry_run ? 'DRY RUN (no DB writes)' : 'LIVE'}"
    puts ""

    records.each_with_index do |rec, idx|
      process_record(rec, idx)
      print_progress(idx + 1, records.size) if (idx + 1) % 50 == 0
    end

    print_progress(records.size, records.size)
    finalize
  end

  private

  # ── Setup ──────────────────────────────────────────────────────────────────

  def setup_user
    user_id = ENV['IOC_USER_ID']
    @user = if user_id
              User.find(user_id)
            else
              Person.first
            end
    raise 'No user found! Set IOC_USER_ID env variable.' unless @user

    puts "👤 Using user: #{@user.name} (ID: #{@user.id})"
  end

  def setup_collections
    @all_collection = Collection.get_all_collection_for_user(@user.id)
    raise "No 'All' collection found for user #{@user.id}" unless @all_collection

    @collection = Collection.find_or_create_by(
      user_id: @user.id,
      label: COLLECTION_LABEL
    ) do |c|
      c.is_locked = false
      c.is_shared = false
    end
    puts "📁 Collection: '#{COLLECTION_LABEL}' (ID: #{@collection.id})"
  end

  # ── SDF Parsing ────────────────────────────────────────────────────────────

  def parse_sdf_file
    puts "📄 Reading SDF file: #{SDF_FILE}"
    raw = File.read(SDF_FILE, encoding: 'ISO-8859-1').encode('UTF-8')
    blocks = raw.split(/\${4}\r?\n/)
    blocks.pop if blocks.last.blank?
    puts "   Found #{blocks.size} record blocks"

    blocks.map { |block| parse_sdf_record(block) }.compact
  end

  def parse_sdf_record(block)
    fields = {}
    block.scan(/^>\s+<([^>]+)>[^\n]*\n(.*?)(?=\n>\s+<|\n\$\$\$\$|\z)/m).each do |key, value|
      fields[key.strip] = value.strip
    end
    fields.presence
  end

  # ── Record Processing ──────────────────────────────────────────────────────

  def process_record(rec, idx)
    ioc_id = rec['ID'] || "row_#{idx + 1}"
    cas_nr = clean_cas(rec['CAS_Nr'])
    substance = rec['substanz']

    record_log = { ioc_id: ioc_id, cas: cas_nr, substance: substance, status: nil, sample_id: nil, error: nil }

    if @dry_run
      record_log[:status] = cas_nr.present? ? 'would_create' : 'would_create_decoupled'
      @stats[cas_nr.present? ? :created : :decoupled] += 1
      @log[:records] << record_log
      return
    end

    ActiveRecord::Base.transaction do
      sample = if cas_nr.present?
                 create_sample_from_cas(rec, cas_nr, ioc_id)
               else
                 create_decoupled_sample(rec, ioc_id)
               end

      if sample&.persisted?
        create_chemical(sample, rec)
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
      @errors << { ioc_id: ioc_id, cas: cas_nr, error: e.message }
    end

    @log[:records] << record_log
  end

  # ── Sample Creation ────────────────────────────────────────────────────────

  def create_sample_from_cas(rec, cas_nr, ioc_id)
    molecule = find_or_create_molecule_by_cas(cas_nr)

    if molecule.nil?
      # Fallback: create decoupled sample if CAS lookup fails
      puts "\n   ⚠️  CAS lookup failed for #{cas_nr} (IOC##{ioc_id}), creating decoupled sample"
      return create_decoupled_sample(rec, ioc_id)
    end

    sample = Sample.new(
      created_by: @user.id,
      molecule_id: molecule.id,
      molfile: molecule.molfile,
      inventory_sample: true
    )

    apply_sample_fields(sample, rec)
    sample.xref['cas'] = cas_nr

    sample.collections << @collection
    sample.collections << @all_collection
    sample.save!
    sample
  end

  def create_decoupled_sample(rec, ioc_id)
    dummy = Molecule.find_or_create_dummy
    cas_nr = clean_cas(rec['CAS_Nr'])

    sample = Sample.new(
      created_by: @user.id,
      molecule_id: dummy.id,
      decoupled: true,
      inventory_sample: true
    )

    apply_sample_fields(sample, rec)
    sample.xref['cas'] = cas_nr if cas_nr.present?

    # For decoupled samples, store the sum_formula if we can derive it
    sample.collections << @collection
    sample.collections << @all_collection
    sample.save!
    sample
  end

  def apply_sample_fields(sample, rec)
    # name: substance name
    sample.name = rec['substanz'] if rec['substanz'].present?

    # external_label: IOC database ID
    sample.external_label = "IOC-#{rec['ID']}" if rec['ID'].present?

    # location: current location
    sample.location = rec['aktueller_Standort'] if rec['aktueller_Standort'].present?

    # description: remarks/notes
    sample.description = rec['Bemerkungen'] if rec['Bemerkungen'].present?
  end

  # ── Molecule Lookup ────────────────────────────────────────────────────────

  def find_or_create_molecule_by_cas(cas_nr)
    # First check if we already have a molecule with this CAS in our cache
    @molecule_cache ||= {}
    return @molecule_cache[cas_nr] if @molecule_cache.key?(cas_nr)

    begin
      result = Chemotion::CasLookupService.fetch_by_cas(cas_nr)
      smiles = result[:smiles]

      if smiles.present?
        molecule = Molecule.find_or_create_by_cano_smiles(smiles)
        @molecule_cache[cas_nr] = molecule
        sleep(API_DELAY) # Rate limiting
        return molecule
      end
    rescue StandardError => e
      Rails.logger.warn "CAS lookup failed for #{cas_nr}: #{e.message}"
    end

    @molecule_cache[cas_nr] = nil
    nil
  end

  # ── Chemical Creation ──────────────────────────────────────────────────────

  def create_chemical(sample, rec)
    chemical = Chemical.new
    chemical.sample_id = sample.id
    chemical.cas = clean_cas(rec['CAS_Nr'])

    chemical_data = build_chemical_data(rec)
    chemical.chemical_data = [chemical_data]

    chemical.save!
    @stats[:chemicals_created] += 1
    chemical
  end

  def build_chemical_data(rec)
    data = {}

    # Vendor info
    data['vendor'] = rec['Firma'] if rec['Firma'].present?
    data['order_number'] = rec['BestNr'] if rec['BestNr'].present?
    data['price'] = rec['Preis'] if rec['Preis'].present?
    data['ordered_date'] = rec['Datum'] if rec['Datum'].present?
    data['status'] = translate_status(rec['Status']) if rec['Status'].present?

    # People
    data['person'] = rec['Kürzel'] if rec['Kürzel'].present?
    data['required_by'] = rec['kürzel2'] if rec['kürzel2'].present?

    # Location
    data['host_room'] = rec['standort'] if rec['standort'].present?

    # Safety phrases
    safety = build_safety_phrases(rec)
    data['safetyPhrases'] = safety if safety.present?

    # Amount / Quantity (Menge)
    parse_chemical_amount(data, rec['Menge']) if rec['Menge'].present?

    # Important notes: merge KatJahrg, Rechnung, cfn
    notes = build_important_notes(rec)
    data['important_notes'] = notes if notes.present?

    data
  end

  def translate_status(status_str)
    # "V" = Vorhanden (available), "N" = Nicht vorhanden (not available)
    # Keep the original value as-is since it may contain multiple statuses
    status_str
  end

  def build_safety_phrases(rec)
    phrases = {}

    if rec['Gefahrensymbole'].present?
      raw_pictograms = rec['Gefahrensymbole'].split(/[,\s]+/).map(&:strip).reject(&:blank?)
      # Keep GHS codes as-is, also keep legacy codes (Xn, T, F, C, Xi, N, etc.)
      phrases['pictograms'] = raw_pictograms
    end

    if rec['R_Sätze'].present?
      h_raw = rec['R_Sätze'].strip
      phrases['h_statements'] = parse_safety_statements(h_raw) unless h_raw == '-'
    end

    if rec['S_Sätze'].present?
      p_raw = rec['S_Sätze'].strip
      phrases['p_statements'] = parse_safety_statements(p_raw) unless p_raw == '-'
    end

    phrases.presence
  end

  def parse_safety_statements(raw)
    # Safety statements can be in formats like:
    #   "H225-H260-H314"  or  "22-36/38-50"  or  "P210-P223"
    #   "302, 315, 410"   or  "P280, P271, P261"
    # Split on common delimiters and return as hash for compatibility
    statements = raw.split(/[-,]\s*/).map(&:strip).reject(&:blank?)
    result = {}
    statements.each { |s| result[s] = s }
    result
  end

  def parse_chemical_amount(data, menge_str)
    clean = menge_str.strip
    clean = clean.split(/\s*x\s*/i).last if clean.match?(/\d+\s*x\s*/i)

    match = clean.match(/^([\d.,]+)\s*(g|mg|kg|ml|mL|l|L|µl|µL|mol|mmol)$/i)
    if match
      value = match[1].tr(',', '.').to_f
      unit = match[2].downcase
      if %w[g mg kg].include?(unit)
        data['amount'] = { 'value' => value, 'unit' => unit == 'kg' ? 'g' : unit }
      elsif %w[ml l µl].include?(unit)
        data['volume'] = { 'value' => value, 'unit' => unit }
      end
    end
  end

  def build_important_notes(rec)
    parts = []
    parts << "Katalog: #{rec['KatJahrg']}" if rec['KatJahrg'].present?
    parts << "Rechnung: #{rec['Rechnung']}" if rec['Rechnung'].present?
    parts << "CFN: #{rec['cfn']}" if rec['cfn'].present?
    parts.join(' | ')
  end

  # ── Utilities ──────────────────────────────────────────────────────────────

  def clean_cas(cas_str)
    return nil if cas_str.blank?

    cleaned = cas_str.strip
    # Valid CAS format: digits-digits-digit (e.g., 108-46-3)
    cleaned.match?(/^\d+-\d+-\d+$/) ? cleaned : nil
  end

  def print_progress(current, total)
    pct = (current.to_f / total * 100).round(1)
    puts "   [#{current}/#{total}] #{pct}% — ✅ #{@stats[:created]} created, " \
         "🔗 #{@stats[:decoupled]} decoupled, ❌ #{@stats[:failed]} failed"
  end

  def header_banner
    <<~BANNER

      ╔══════════════════════════════════════════════════════════════╗
      ║         IOC Database → Chemotion ELN Migration             ║
      ╚══════════════════════════════════════════════════════════════╝

    BANNER
  end

  def finalize
    @log[:finished_at] = Time.current
    @log[:stats] = @stats
    @log[:errors_summary] = @errors.first(100) # Keep first 100 errors

    File.write(LOG_FILE, JSON.pretty_generate(@log))

    puts ""
    puts "=" * 60
    puts "📊 MIGRATION COMPLETE"
    puts "=" * 60
    puts "   Total records:       #{@stats[:total]}"
    puts "   ✅ Created (with mol): #{@stats[:created]}"
    puts "   🔗 Decoupled (no mol): #{@stats[:decoupled]}"
    puts "   ⏭️  Skipped:            #{@stats[:skipped]}"
    puts "   ❌ Failed:             #{@stats[:failed]}"
    puts "   🧪 Chemicals created:  #{@stats[:chemicals_created]}"
    puts "   📝 Log file:          #{LOG_FILE}"
    puts "=" * 60

    if @errors.any?
      puts "\n⚠️  First 10 errors:"
      @errors.first(10).each do |err|
        puts "   IOC##{err[:ioc_id]} (CAS: #{err[:cas]}): #{err[:error]}"
      end
    end
  end
end

# ── Run ────────────────────────────────────────────────────────────────────────
IocMigration.new.run
