#!/usr/bin/env ruby
# frozen_string_literal: true

# Step 4: Export Excel sheet with mapped IOC SDF data
# Usage: cd /home/ubuntu/app && rails runner lib/tasks/ioc_migration/step4_export_excel.rb
#
# Produces: tmp/ioc_migration_mapped_data.xlsx with two sheets:
#   1. "Mapping" - shows the field mapping between IOC SDF and Chemotion
#   2. "Sample Data" - IOC SDF data under Chemotion-mapped column names
#   3. "Chemical Data" - IOC SDF data under Chemotion Chemical mapped column names

require 'caxlsx'

# ── SDF file reading ──────────────────────────────────────────────────────────
sdf_path = Rails.root.join('SDFile_IOC-Database_20251219.sdf')
raw = File.read(sdf_path, encoding: 'ISO-8859-1').encode('UTF-8')
records_raw = raw.split(/\${4}\r?\n/)
records_raw.pop if records_raw.last.blank?

puts "Parsed #{records_raw.size} records from SDF file"

# ── Parse each record ─────────────────────────────────────────────────────────
def parse_sdf_record(block)
  fields = {}
  block.scan(/^>\s+<([^>]+)>[^\n]*\n(.*?)(?=\n>\s+<|\n\$\$\$\$|\z)/m).each do |key, value|
    fields[key.strip] = value.strip
  end
  fields
end

records = records_raw.map { |r| parse_sdf_record(r) }
puts "Parsed fields for #{records.size} records"

# ── Field Mapping Definition ──────────────────────────────────────────────────
# Each mapping: [ioc_header, chemotion_field, table, german_meaning]
MAPPING = [
  ['ID',                 'external_label',                     'Sample',   'Original DB ID'],
  ['substanz',           'name',                               'Sample',   'Substance name'],
  ['CAS_Nr',             'cas',                                'Sample',   'CAS number'],
  ['aktueller_Standort', 'location',                           'Sample',   'Current location'],
  ['Bemerkungen',        'description',                        'Sample',   'Remarks / Notes'],
  ['CAS_Nr',             'chemical.cas',                       'Chemical', 'CAS number'],
  ['BestNr',             'chemical_data.order_number',         'Chemical', 'Order number'],
  ['Menge',              'chemical_data.amount',               'Chemical', 'Amount / Quantity'],
  ['Firma',              'chemical_data.vendor',               'Chemical', 'Company / Vendor'],
  ['Preis',              'chemical_data.price',                'Chemical', 'Price'],
  ['Datum',              'chemical_data.ordered_date',         'Chemical', 'Date ordered'],
  ['Status',             'chemical_data.status',               'Chemical', 'Status (V=available)'],
  ['Gefahrensymbole',    'chemical_data.safety_phrases.pictograms',   'Chemical', 'Hazard symbols (GHS)'],
  ['R_Sätze',            'chemical_data.safety_phrases.h_statements', 'Chemical', 'Risk / H-phrases'],
  ['S_Sätze',            'chemical_data.safety_phrases.p_statements', 'Chemical', 'Safety / P-phrases'],
  ['standort',           'chemical_data.host_room',            'Chemical', 'Original storage location'],
  ['Kürzel',             'chemical_data.person',               'Chemical', 'Person abbreviation'],
  ['kürzel2',            'chemical_data.required_by',          'Chemical', 'Second person abbreviation'],
  ['KatJahrg',           'chemical_data.important_notes',      'Chemical', 'Catalog year → important notes'],
  ['Rechnung',           'chemical_data.important_notes',      'Chemical', 'Invoice → important notes'],
  ['cfn',                'chemical_data.important_notes',      'Chemical', 'CFN flag → important notes'],
].freeze

# ── Derive column lists ──────────────────────────────────────────────────────
SAMPLE_FIELDS = MAPPING.select { |_, _, t, _| t == 'Sample' }.freeze
CHEMICAL_FIELDS = MAPPING.select { |_, _, t, _| t == 'Chemical' }.freeze

# Important‑notes fields that get merged into one column
IMPORTANT_NOTES_IOC_KEYS = %w[KatJahrg Rechnung cfn].freeze

# ── Build Excel ───────────────────────────────────────────────────────────────
output_path = Rails.root.join('tmp', 'ioc_migration_mapped_data.xlsx')

package = Axlsx::Package.new
wb = package.workbook

# Styles
header_style = wb.styles.add_style(
  bg_color: '4472C4', fg_color: 'FFFFFF', b: true, alignment: { horizontal: :center },
  border: { style: :thin, color: '000000' }
)
mapping_sample_style = wb.styles.add_style(bg_color: 'D6E4F0', border: { style: :thin, color: '000000' })
mapping_chemical_style = wb.styles.add_style(bg_color: 'FFF2CC', border: { style: :thin, color: '000000' })
cell_style = wb.styles.add_style(border: { style: :thin, color: '000000' }, alignment: { wrap_text: true })

# ── Sheet 1: Mapping ─────────────────────────────────────────────────────────
wb.add_worksheet(name: 'Mapping') do |sheet|
  sheet.add_row ['IOC SDF Header', 'German Meaning', 'Chemotion Target Field', 'Target Table'], style: header_style
  MAPPING.each do |ioc, chemo, table, meaning|
    style = table == 'Sample' ? mapping_sample_style : mapping_chemical_style
    sheet.add_row [ioc, meaning, chemo, table], style: style
  end
  sheet.column_widths 25, 35, 45, 15
end

# ── Sheet 2: Sample Data ─────────────────────────────────────────────────────
wb.add_worksheet(name: 'Sample Data') do |sheet|
  # Headers: Chemotion field names
  sample_headers = SAMPLE_FIELDS.map { |_, chemo, _, _| chemo }
  sheet.add_row sample_headers, style: header_style

  records.each do |rec|
    row = SAMPLE_FIELDS.map { |ioc, _, _, _| rec[ioc] || '' }
    sheet.add_row row, style: cell_style
  end

  sheet.column_widths(*sample_headers.map { 25 })
end

# ── Sheet 3: Chemical Data ────────────────────────────────────────────────────
wb.add_worksheet(name: 'Chemical Data') do |sheet|
  # Build unique chemical columns (merge the 3 important_notes sources into one)
  chem_columns = []
  CHEMICAL_FIELDS.each do |ioc, chemo, _, meaning|
    next if chemo == 'chemical_data.important_notes' && chem_columns.any? { |c| c[:chemo] == 'chemical_data.important_notes' }

    chem_columns << { ioc: ioc, chemo: chemo, meaning: meaning }
  end

  chem_headers = chem_columns.map { |c| c[:chemo] }
  sheet.add_row chem_headers, style: header_style

  records.each do |rec|
    row = chem_columns.map do |col|
      if col[:chemo] == 'chemical_data.important_notes'
        # Merge KatJahrg, Rechnung, cfn into one cell
        parts = []
        parts << "Katalog: #{rec['KatJahrg']}" if rec['KatJahrg'].present?
        parts << "Rechnung: #{rec['Rechnung']}" if rec['Rechnung'].present?
        parts << "CFN: #{rec['cfn']}" if rec['cfn'].present?
        parts.join("\n")
      else
        rec[col[:ioc]] || ''
      end
    end
    sheet.add_row row, style: cell_style
  end

  sheet.column_widths(*chem_headers.map { 25 })
end

package.serialize(output_path.to_s)
puts "\n✅ Excel exported to: #{output_path}"
puts "   Sheets: Mapping, Sample Data (#{records.size} rows), Chemical Data (#{records.size} rows)"
