#!/usr/bin/env ruby
# frozen_string_literal: true

# =============================================================================
# IOC Inventory Export Script – grouped by location
# =============================================================================
#
# Exports chemical-inventory samples from a Chemotion ELN collection into an
# XLSX workbook (inside a downloadable ZIP) with one sheet per unique storage
# location, following the column layout of MUSTER-Import.xlsx.
#
# Each sheet contains records that share the same location key, derived from:
#   1. Chemical → chemical_data[0] → host_building / host_room / host_cabinet / host_group
#   2. Fallback: Sample → location field
#
# Column mapping (MUSTER-Import.xlsx order):
#   A  Produktbezeichnung      → sample.name (or molecule.iupac_name)
#   B  Packungsgr.,Mengeneinh. → chemical amount/volume value+unit
#   C  CAS-Nr.                 → sample.xref['cas'] or chemical.cas
#   D  Hersteller              → chemical vendor
#   E  Produkt-Id              → chemical order_number (manufacturer catalog #)
#   F  Raum                    → host_room (from chemical_data)
#   G  Platz                   → host_cabinet (from chemical_data)
#   H  verb. Inh.              → (consumed / remaining quantity – left blank)
#   I  Mengeneinheit           → unit portion of amount/volume
#   J  Händler                 → chemical vendor (dealer/distributor)
#   K  Katalognummer           → chemical order_number
#   L  interner Code           → sample.xref['inventory_label'] (e.g. BR-1234)
#   M  Bemerkung (kurz)        → chemical important_notes
#
# Usage:
#   cd /home/ubuntu/app
#   RAILS_ENV=production rails runner lib/tasks/ioc_migration/export_ioc_inventory.rb COLLECTION_ID
#
# Example:
#   rails runner lib/tasks/ioc_migration/export_ioc_inventory.rb 42
#
# Output:
#   A ZIP file at public/zip/ioc_export_<collection_id>_<timestamp>.zip
#   containing one XLSX workbook with one sheet per location group.
#   A download link is printed to stdout.
#
# =============================================================================

require 'zip'

class IocInventoryExport
  MUSTER_HEADERS = [
    'Produktbezeichnung',
    'Packungsgr.,Mengeneinh.',
    'CAS-Nr.',
    'Hersteller',
    'Produkt-Id',
    'Raum',
    'Platz',
    'verb. Inh.',
    'Mengeneinheit',
    'Händler',
    'Katalognummer',
    'interner Code',
    'Bemerkung (kurz)',
  ].freeze

  MAX_SHEET_NAME_LEN = 31 # Excel limit

  attr_reader :collection, :stats

  def initialize(collection_id)
    @collection = Collection.find(collection_id)
    @stats = { total_samples: 0, total_chemicals: 0, location_groups: 0, skipped: 0 }
    puts "📁 Collection: '#{@collection.label}' (ID: #{@collection.id})"
  end

  def run
    puts header_banner

    # Step 1: Load samples and their chemicals
    samples = load_samples
    @stats[:total_samples] = samples.size
    puts "📊 Samples in collection: #{samples.size}"

    # Step 2: Build rows and group by location key
    grouped = group_by_location(samples)
    @stats[:location_groups] = grouped.size
    puts "📍 Unique location groups: #{grouped.size}"
    puts ""

    # Step 3: Write ZIP with one XLSX file per location group
    zip_path = write_zip(grouped)

    print_summary(zip_path)
  end

  private

  # ── Data Loading ───────────────────────────────────────────────────────────

  def load_samples
    @collection.samples
               .includes(:molecule, :chemical)
               .where(deleted_at: nil)
               .order(:id)
               .to_a
  end

  # ── Location Grouping ─────────────────────────────────────────────────────

  def group_by_location(samples)
    groups = Hash.new { |h, k| h[k] = [] }

    samples.each do |sample|
      chemical = sample.chemical
      cd = chemical&.chemical_data&.first || {}

      location_key = build_location_key(sample, cd)
      row = build_row(sample, chemical, cd)

      groups[location_key] << row
      @stats[:total_chemicals] += 1 if chemical.present?
    end

    groups
  end

  def build_location_key(sample, cd)
    # Primary: chemical_data host fields
    host_building = cd['host_building'].presence
    host_room     = cd['host_room'].presence
    host_cabinet  = cd['host_cabinet'].presence
    host_group    = cd['host_group'].presence

    if host_building || host_room || host_cabinet || host_group
      [host_building, host_room, host_cabinet, host_group].map { |v| v || '' }.join(' | ')
    elsif sample.location.present?
      # Fallback to sample location
      sample.location.strip
    else
      'Unbekannt'
    end
  end

  # ── Row Building ───────────────────────────────────────────────────────────

  def build_row(sample, chemical, cd)
    cas = sample.xref&.dig('cas').presence || chemical&.cas
    amount_str, unit_str = extract_amount_and_unit(cd)

    # Hersteller = manufacturer (vendor from chemical_data)
    vendor = cd['vendor'].presence
    # Produkt-Id = manufacturer's product/catalog number
    produkt_id = cd['order_number'].presence
    # Händler = dealer (in this import, same source as vendor; kept separate for template)
    haendler = vendor

    {
      produktbezeichnung: sample.name.presence || sample.molecule&.iupac_name || '',
      packungsgr_mengeneinh: amount_str,
      cas_nr: cas || '',
      hersteller: vendor || '',
      produkt_id: produkt_id || '',
      raum: cd['host_room'].presence || '',
      platz: cd['host_cabinet'].presence || '',
      verb_inh: '',
      mengeneinheit: unit_str,
      haendler: haendler || '',
      katalognummer: produkt_id || '',
      interner_code: sample.xref&.dig('inventory_label') || '',
      bemerkung: cd['important_notes'].presence || '',
    }
  end

  def extract_amount_and_unit(cd)
    # Amount or volume from chemical_data
    amount = cd['amount'] || cd['volume']
    return ['', ''] unless amount.is_a?(Hash)

    value = amount['value']
    unit  = amount['unit']
    return ['', ''] unless value.present? && unit.present?

    ["#{value} #{unit}", unit.to_s]
  end

  # ── XLSX Generation ────────────────────────────────────────────────────────

  def generate_xlsx_for_location(rows)
    package = Axlsx::Package.new
    wb = package.workbook

    header_style = wb.styles.add_style(
      b: true,
      sz: 11,
      font_name: 'Calibri',
      border: { style: :thin, color: '000000' },
      bg_color: 'D9E1F2',
    )

    wb.add_worksheet(name: 'Inventory') do |sheet|
      sheet.add_row(MUSTER_HEADERS, style: header_style)

      rows.each do |row|
        sheet.add_row(row_to_array(row))
      end

      sheet.column_widths(*Array.new(MUSTER_HEADERS.size, 18))
    end

    package.to_stream.read
  end

  def row_to_array(row)
    [
      row[:produktbezeichnung],
      row[:packungsgr_mengeneinh],
      row[:cas_nr],
      row[:hersteller],
      row[:produkt_id],
      row[:raum],
      row[:platz],
      row[:verb_inh],
      row[:mengeneinheit],
      row[:haendler],
      row[:katalognummer],
      row[:interner_code],
      row[:bemerkung],
    ]
  end

  def sanitize_filename(location_key, seen_names)
    # Sanitize for use as a filename inside the ZIP
    name = location_key.gsub(/[\[\]:*?\/\\<>|"]/, '_').strip
    name = 'Unbekannt' if name.blank?
    name = name[0, 80]

    # Ensure uniqueness
    if seen_names.key?(name)
      seen_names[name] += 1
      name = "#{name} (#{seen_names[name]})"
    else
      seen_names[name] = 0
    end

    name
  end

  # ── ZIP Output ─────────────────────────────────────────────────────────────

  def write_zip(grouped)
    timestamp = Time.current.strftime('%Y%m%d_%H%M%S')
    filename = "ioc_export_#{@collection.id}_#{timestamp}.zip"
    zip_dir = Rails.public_path.join('zip')
    FileUtils.mkdir_p(zip_dir)
    zip_path = zip_dir.join(filename)

    seen_names = {}

    Zip::OutputStream.open(zip_path.to_s) do |zos|
      grouped.each do |location_key, rows|
        xlsx_name = sanitize_filename(location_key, seen_names)
        xlsx_data = generate_xlsx_for_location(rows)

        zos.put_next_entry("#{xlsx_name}.xlsx")
        zos.write(xlsx_data)
      end
    end

    zip_path
  end

  # ── Display ────────────────────────────────────────────────────────────────

  def header_banner
    <<~BANNER

      ╔══════════════════════════════════════════════════════════════╗
      ║       IOC Inventory Export – Grouped by Location            ║
      ╚══════════════════════════════════════════════════════════════╝

    BANNER
  end

  def print_summary(zip_path)
    filename = File.basename(zip_path)
    root_url = Rails.application.config.root_url rescue 'http://localhost:3000'
    link = "#{root_url}/zip/#{filename}"

    puts ""
    puts '=' * 60
    puts '📊 EXPORT COMPLETE'
    puts '=' * 60
    puts "   Total samples:       #{@stats[:total_samples]}"
    puts "   With chemicals:      #{@stats[:total_chemicals]}"
    puts "   Location groups:     #{@stats[:location_groups]}"
    puts "   ZIP file:            #{zip_path}"
    puts "   Download link:       #{link}"
    puts '=' * 60
  end
end

# ── Run ────────────────────────────────────────────────────────────────────────

collection_id = ARGV[0] || ENV['IOC_COLLECTION_ID']
unless collection_id.present?
  puts 'Usage: rails runner lib/tasks/ioc_migration/export_ioc_inventory.rb COLLECTION_ID'
  puts '  or:  IOC_COLLECTION_ID=42 rails runner lib/tasks/ioc_migration/export_ioc_inventory.rb'
  exit 1
end

IocInventoryExport.new(collection_id.to_i).run
