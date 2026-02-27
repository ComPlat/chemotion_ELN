#!/usr/bin/env ruby
# frozen_string_literal: true

# Step 2: Compare IOC SDF headers with existing sample and chemical table columns
# Usage: cd /home/ubuntu/app && rails runner lib/tasks/ioc_migration/step2_compare_tables.rb

puts "=" * 70
puts "SAMPLE TABLE COLUMNS"
puts "=" * 70
Sample.column_names.sort.each { |c| puts "  #{c}" }

puts "\n" + "=" * 70
puts "CHEMICAL TABLE COLUMNS"
puts "=" * 70
Chemical.column_names.sort.each { |c| puts "  #{c}" }

puts "\n" + "=" * 70
puts "SAMPLE xref JSONB fields (from first non-empty record)"
puts "=" * 70
sample_with_xref = Sample.where("xref IS NOT NULL AND xref != '{}'::jsonb").first
if sample_with_xref
  puts "  xref keys: #{sample_with_xref.xref.keys.join(', ')}"
else
  puts "  (no samples with xref data found)"
  puts "  Known xref keys: cas, inventory_label, flash_point, refractive_index, form, color, solubility"
end

puts "\n" + "=" * 70
puts "CHEMICAL chemical_data JSONB fields (from first non-empty record)"
puts "=" * 70
chemical = Chemical.where("chemical_data IS NOT NULL AND chemical_data != '[]'::jsonb").first
if chemical
  puts "  Raw chemical_data: #{chemical.chemical_data.inspect[0..500]}"
  if chemical.chemical_data.is_a?(Array) && chemical.chemical_data.first.is_a?(Hash)
    puts "  Keys: #{chemical.chemical_data.first.keys.join(', ')}"
  end
else
  puts "  (no chemicals with chemical_data found)"
end

# IOC SDF Headers for comparison
IOC_HEADERS = %w[
  aktueller_Standort Bemerkungen BestNr CAS_Nr cfn Datum Firma
  Gefahrensymbole ID KatJahrg Kürzel kürzel2 Menge Preis
  R_Sätze Rechnung S_Sätze standort Status substanz
].freeze

puts "\n" + "=" * 70
puts "IOC SDF HEADERS"
puts "=" * 70
IOC_HEADERS.each { |h| puts "  #{h}" }

# Chemotion mappable keys (from Import::ImportSdf#keys_to_map)
CHEMOTION_MAPPABLE = {
  description: 'Description',
  location: 'Location',
  name: 'Name',
  external_label: 'External label',
  purity: 'Purity',
  molecule_name: 'Molecule Name',
  short_label: 'Short Label',
  real_amount: 'Real Amount',
  real_amount_unit: 'Real Amount Unit',
  target_amount: 'Target Amount',
  target_amount_unit: 'Target Amount Unit',
  molarity: 'Molarity',
  density: 'Density',
  melting_point: 'Melting Point',
  boiling_point: 'Boiling Point',
  cas: 'CAS',
  solvent: 'Solvent',
  dry_solvent: 'Dry Solvent',
  refractive_index: 'Refractive index',
  flash_point: 'Flash point',
  solubility: 'Solubility',
  color: 'Color',
  form: 'Form',
  inventory_label: 'Inventory Label',
}.freeze

puts "\n" + "=" * 70
puts "CHEMOTION MAPPABLE FIELDS (ImportSdf#keys_to_map)"
puts "=" * 70
CHEMOTION_MAPPABLE.each { |k, v| puts "  %-25s => %s" % [k, v] }
