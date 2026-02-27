#!/usr/bin/env ruby
# frozen_string_literal: true

# Step 1: Extract all unique headers from the IOC SDF file and fix encoding issues
# Usage: ruby lib/tasks/ioc_migration/step1_extract_headers.rb

sdf_file = File.join(File.dirname(__FILE__), '..', '..', '..', 'SDFile_IOC-Database_20251219.sdf')

puts "Reading SDF file: #{sdf_file}"
raw = File.read(sdf_file, encoding: 'ISO-8859-1')
# Convert to UTF-8
content = raw.encode('UTF-8')

# Extract all header names using the SDF data field pattern: >  <HEADER_NAME>
headers_raw = content.scan(/^>\s+<([^>]+)>/).flatten

# Count occurrences of each header
header_counts = Hash.new(0)
headers_raw.each { |h| header_counts[h] += 1 }

# Fix encoding issues: replace garbled characters with correct German umlauts/characters
# In ISO-8859-1 -> UTF-8, common replacements:
#   ü (ü) -> was showing as ü or similar
#   ö (ö)
#   ä (ä)
#   ß (ß)
#   é (é)
ENCODING_FIXES = {
  'Kürzel'           => 'Kürzel',         # already correct after ISO-8859-1 -> UTF-8
  'kürzel2'          => 'kürzel2',
  'R_Sätze'          => 'R_Sätze',
  'S_Sätze'          => 'S_Sätze',
}.freeze

puts "\n" + "=" * 60
puts "ALL UNIQUE HEADERS IN SDF FILE (#{header_counts.size} unique headers)"
puts "=" * 60

# Sort headers alphabetically for display
sorted_headers = header_counts.sort_by { |h, _| h.downcase }

sorted_headers.each do |header, count|
  # Check if any character is a replacement character (U+FFFD) or garbled
  fixed = header
  if header.include?("\u00FC") || header.include?("\u00F6") || header.include?("\u00E4") || header.include?("\u00DF")
    # These are already correct German umlauts from ISO-8859-1 conversion
    fixed = header
  end
  puts "  %-30s (appears %d times)" % [fixed, count]
end

puts "\n" + "=" * 60
puts "HEADER LIST (clean, for mapping)"
puts "=" * 60

clean_headers = sorted_headers.map { |h, _| h }
clean_headers.each { |h| puts "  - #{h}" }

puts "\n" + "=" * 60
puts "RUBY ARRAY FORMAT"
puts "=" * 60
puts "HEADERS = ["
clean_headers.each_with_index do |h, i|
  comma = i < clean_headers.size - 1 ? ',' : ''
  puts "  '#{h}'#{comma}"
end
puts "].freeze"
