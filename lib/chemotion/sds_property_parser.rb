# frozen_string_literal: true

module Chemotion
  # Reads the section 9 lines of an SDS into the flat property hash the chemical tab
  # consumes. Cf. ChemicalTab.js#mapToSampleProperties for the keys it reads.
  class SdsPropertyParser
    # Normalised sheet label => the key ChemicalTab.js reads.
    LABELS = {
      'physical state' => 'form', 'form' => 'form',
      'colour' => 'color', 'color' => 'color',
      'odour' => 'odor', 'odor' => 'odor',
      'melting point' => 'melting_point', 'melting point/freezing point' => 'melting_point',
      'melting point/range' => 'melting_point', 'melting point/melting range' => 'melting_point',
      'boiling point' => 'boiling_point', 'boiling point/range' => 'boiling_point',
      'boiling point/boiling range' => 'boiling_point',
      'initial boiling point and boiling range' => 'boiling_point',
      'flash point' => 'flash_point',
      'autoignition temperature' => 'autoignition_temperature',
      'decomposition temperature' => 'decomposition_temperature',
      'ph' => 'ph', 'ph-value' => 'ph',
      'water solubility' => 'solubility', 'solubility' => 'solubility',
      'solubility in water' => 'solubility',
      'vapour pressure' => 'vapor_pressure', 'vapor pressure' => 'vapor_pressure',
      'density' => 'density', 'density/specific gravity' => 'density',
      'relative density' => 'relative_density',
      'relative vapour density' => 'vapor_density', 'relative vapor density' => 'vapor_density',
      'vapour density' => 'vapor_density', 'vapor density' => 'vapor_density',
      'viscosity' => 'viscosity', 'viscosity, dynamic' => 'viscosity_dynamic',
      'viscosity, kinematic' => 'viscosity_kinematic',
      'molecular weight' => 'molecular_weight',
      'refractive index' => 'refractive_index',
      # German Sigma sheets, whose section 9 is the same lettered layout.
      'physikalischer zustand' => 'form', 'aggregatzustand' => 'form',
      'farbe' => 'color', 'geruch' => 'odor',
      'schmelzpunkt' => 'melting_point', 'schmelzpunkt/gefrierpunkt' => 'melting_point',
      'siedepunkt' => 'boiling_point', 'siedebeginn und siedebereich' => 'boiling_point',
      'siedepunkt/siedebereich' => 'boiling_point',
      'flammpunkt' => 'flash_point',
      'zündtemperatur' => 'autoignition_temperature',
      'zersetzungstemperatur' => 'decomposition_temperature',
      'ph-wert' => 'ph',
      'wasserlöslichkeit' => 'solubility', 'löslichkeit' => 'solubility',
      'löslichkeit in wasser' => 'solubility',
      'dampfdruck' => 'vapor_pressure',
      'dichte' => 'density', 'relative dichte' => 'relative_density',
      'relative dampfdichte' => 'vapor_density', 'dampfdichte' => 'vapor_density',
      'viskosität' => 'viscosity',
      'viskosität, dynamisch' => 'viscosity_dynamic',
      'viskosität, kinematisch' => 'viscosity_kinematic',
      'molekulargewicht' => 'molecular_weight', 'molmasse' => 'molecular_weight',
      'brechungsindex' => 'refractive_index'
    }.freeze
    TEXT_KEYS = %w[form color odor solubility].freeze
    # Keys whose consumer can hold a span; density and flash point take one number or nothing.
    RANGE_KEYS = %w[melting_point boiling_point refractive_index ph].freeze
    # Below this a lone second line is a wrapped label, above it a wrapped value.
    INDENT_TOLERANCE = 2
    CELL_GAP = /\s{3,}/.freeze
    COLON_SEPARATOR = /\A(.*?)\s:\s(.*)\z/.freeze
    LETTER_PREFIX = /\A[a-z]\)\s*/i.freeze
    MAX_REPORTED_LABELS = 40

    def initialize(lines)
      @lines = Array(lines)
      @values = SdsValueParser.new(@lines.join("\n"))
      @properties = {}
      @accepted = {}
      @skipped = {}
    end

    def parse
      rows.each { |row| absorb(row) }
      [@properties, diagnostics]
    end

    private

    def diagnostics
      {
        'decimal_style' => @values.decimal_style.to_s,
        'accepted' => @accepted,
        'skipped' => @skipped,
        'unmapped_labels' => unmapped_labels,
      }
    end

    # First row wins: a repeated label is a second table, not a correction.
    def absorb(row)
      key = LABELS[row[:label]]
      return if key.nil? || @properties.key?(key) || @skipped.key?(key)

      parsed = parse_value(key, without_repeated_label(key, row[:value]))
      entry = { 'label' => row[:label], 'raw' => row[:value] }
      return @skipped[key] = entry.merge('reason' => parsed['reason']) if parsed['reason']

      @properties[key] = parsed['display']
      @accepted[key] = entry.merge(parsed)
    end

    def parse_value(key, raw)
      return @values.parse_text(raw) if TEXT_KEYS.include?(key)

      @values.parse_quantity(raw, allow_range: RANGE_KEYS.include?(key))
    end

    # Sigma repeats the label inside the value cell ("Melting point/ range: 12 - 13 °C").
    def without_repeated_label(key, value)
      match = value.match(/\A([^:]{1,40}):\s*(\S.*)\z/)
      return value if match.nil? || LABELS[normalize_label(match[1])] != key

      match[2]
    end

    def unmapped_labels
      rows.reject { |row| LABELS.key?(row[:label]) }
          .pluck(:label).uniq.first(MAX_REPORTED_LABELS)
    end

    def rows
      @rows ||= @lines.each_with_object([]) do |line, out|
        body = line.strip.sub(LETTER_PREFIX, '')
        next if body.empty?

        label, value = split_line(body)
        indent = label_indent(line)
        merge_continuation(out, indent, label)
        next if value.nil?

        out << { label: normalize_label(label), value: value.strip, indent: indent }
      end
    end

    # A wrapped label spans two lines; only an exact hit on the merged text counts as one.
    def merge_continuation(out, indent, text)
      previous = out.last
      return if previous.nil? || LABELS.key?(previous[:label])
      return if (indent - previous[:indent]).abs > INDENT_TOLERANCE

      merged = normalize_label("#{previous[:label]} #{text}")
      previous[:label] = merged if LABELS.key?(merged)
    end

    # Sigma writes "Label : value", Fisher aligns columns; neither uses both on one line.
    def split_line(line)
      match = line.match(COLON_SEPARATOR)
      return [match[1], match[2]] if match

      cells = line.strip.split(CELL_GAP)
      cells.length >= 2 ? [cells[0], cells[1]] : [cells[0], nil]
    end

    def normalize_label(label)
      label.to_s.gsub(/\s+/, ' ').gsub(%r{\s*/\s*}, '/').strip
           .sub(LETTER_PREFIX, '').sub(/[:.]\z/, '').downcase
    end

    def label_indent(line)
      leading = line[/\A\s*/].length
      prefix = line[leading..][LETTER_PREFIX]
      leading + (prefix ? prefix.length : 0)
    end
  end
end
