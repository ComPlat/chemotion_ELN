# frozen_string_literal: true

module Chemotion
  # Turns one value cell from an SDS section 9 into a display string plus its parsed
  # {value, unit}, or into a reason the cell was left out.
  class SdsValueParser
    ABSENT = %r{\A(no\s+data\s+available|no\s+information\s+available|not\s+available|
                  not\s+applicable|not\s+determined|not\s+specified|not\s+established|
                  keine\s+daten\s+verf(ü|ue)gbar|nicht\s+anwendbar|nicht\s+verf(ü|ue)gbar|
                  nicht\s+bestimmt|keine\s+angaben|
                  none|n/?a|[-–—])\b}xi.freeze
    QUALIFIER = /[<>≤≥~]|\b(ca|approx|approximately|about|est|estimated)\b/i.freeze
    UNITS = ['°C', '°F', 'K', 'hPa', 'kPa', 'MPa', 'mPa.s', 'mPa·s', 'Pa', 'mbar', 'bar',
             'mmHg', 'atm', 'psi', 'g/cm3', 'g/cm³', 'g/mL', 'g/ml', 'kg/m3', 'kg/L', 'g/L',
             'g/l', 'mg/L', 'mg/l', 'g/mol', 'mm2/s', 'mm²/s', 'cSt', 'cP', '%'].freeze
    UNIT_RE = Regexp.union(UNITS.sort_by { |unit| -unit.length }).freeze
    NUM = /(?:-?\d[\d.,]*\d|-?\d)/.freeze
    DUAL_UNIT = %r{\A(#{NUM})\s*°C\s*/\s*#{NUM}\s*°F\z}.freeze
    RANGE = /\A(#{NUM})\s*(?:-|–|to)\s*(#{NUM})\s*(#{UNIT_RE})?\z/.freeze
    SINGLE = /\A(#{NUM})\s*(#{UNIT_RE})?\z/.freeze
    UNIT_BEARING = /(#{NUM})\s*(?=#{UNIT_RE})/.freeze
    PLAIN_NUMBER = /\A-?\d+(\.\d+)?\z/.freeze
    BRACKETED = /\A(.*?)\s*\(([^()]*)\)\z/.freeze
    MEASURED_AT = /\A(.*?)(?:\s+at\s+|\s+bei\s+|\s*@\s*)(.+)\z/i.freeze
    # A value may be qualified by the temperature or pressure it was measured at, nothing else.
    CONDITION = /\A-?\d[\d.,]*\s*(°C|°F|K|hPa|kPa|mbar|bar|mmHg|atm|Pa)\z/.freeze
    # Sigma appends its source or method to the value cell; neither changes the number.
    PROVENANCE = /\s*-\s*(lit\.?|closed cup|open cup|geschlossener\s+Tiegel|offener\s+Tiegel)\z/i.freeze
    BLANKS = "\u00A0\u2007\u202F"
    MAX_TEXT_LENGTH = 80
    # Ordered: the first signal that points one way settles the sheet's decimal separator.
    DECIMAL_SIGNALS = [
      [/\d\.\d{3},\d/, /\d,\d{3}\.\d/],
      [/\A-?0,\d/, /\A-?0\.\d/],
      [/,\d{1,2}(?!\d)/, /\.\d{1,2}(?!\d)/],
      [/\.\d{3}(?!\d)/, /,\d{3}(?!\d)/],
    ].freeze

    # +section_text+ decides the decimal convention; an English Sigma sheet still writes "0,791".
    def initialize(section_text)
      @section_text = section_text.to_s
    end

    # :german, :english, or :ambiguous when the sheet uses both and settles neither.
    def decimal_style
      @decimal_style ||= infer_decimal_style
    end

    def parse_text(raw)
      text = clean(raw)
      return { 'reason' => 'absent' } if text.empty? || text.match?(ABSENT)
      return { 'reason' => 'too_long' } if text.length > MAX_TEXT_LENGTH

      { 'display' => text, 'value' => text, 'unit' => nil }
    end

    def parse_quantity(raw, allow_range: false)
      text = clean(raw)
      return { 'reason' => 'absent' } if text.empty? || text.match?(ABSENT)

      text, condition = split_condition(text)
      return { 'reason' => 'unparsed_condition' } if text.nil?

      parse_body(text, condition, allow_range)
    end

    private

    def parse_body(text, condition, allow_range)
      dual = dual_unit(text, condition)
      return dual if dual

      range = range_value(text, condition, allow_range)
      return range if range
      return { 'reason' => 'qualifier' } if text.match?(QUALIFIER)

      single_value(text, condition)
    end

    def clean(raw)
      raw.to_s.tr(BLANKS, ' ').tr('−', '-').gsub(/\s+/, ' ').strip.sub(PROVENANCE, '')
    end

    # Strips a trailing "(25 °C)" or "at 25 °C"; nil signals a trailer that is not a condition.
    def split_condition(text)
      match = text.match(BRACKETED) || text.match(MEASURED_AT)
      return [text, nil] unless match

      condition = normalize_number_in(clean(match[2]))
      return [nil, nil] unless condition.match?(CONDITION)

      [match[1].strip, condition]
    end

    def dual_unit(text, condition)
      match = text.match(DUAL_UNIT)
      match ? build(match[1], '°C', condition) : nil
    end

    def range_value(text, condition, allow_range)
      match = text.match(RANGE)
      return nil unless match
      return { 'reason' => 'range' } unless allow_range

      low = number(match[1])
      high = number(match[2])
      return { 'reason' => 'unparsed_number' } if low.nil? || high.nil?

      display = [[low, high].join(' - '), match[3]].compact.join(' ')
      { 'display' => with_condition(display, condition), 'value' => [low.to_f, high.to_f],
        'unit' => match[3], 'condition' => condition }
    end

    def single_value(text, condition)
      match = text.match(SINGLE)
      return { 'reason' => 'unparsed' } unless match

      build(match[1], match[2], condition)
    end

    def build(raw_number, unit, condition)
      number = number(raw_number)
      return { 'reason' => 'unparsed_number' } if number.nil?

      display = with_condition([number, unit].compact.join(' '), condition)
      { 'display' => display, 'value' => number.to_f, 'unit' => unit, 'condition' => condition }
    end

    def with_condition(display, condition)
      condition ? "#{display} (#{condition})" : display
    end

    # Keeps the digits as written so 0.770 does not become 0.77.
    def number(token)
      normalized = normalize_number_in(token)
      normalized.match?(PLAIN_NUMBER) ? normalized : nil
    end

    def normalize_number_in(text)
      case decimal_style
      when :german then text.gsub(/(\d)\.(\d{3})/, '\1\2').tr(',', '.')
      when :english then text.gsub(/(\d),(\d{3})/, '\1\2')
      else text.include?(',') ? '' : text
      end
    end

    # Only numbers that carry a unit, so subsection numbers and page counts cannot vote.
    def infer_decimal_style
      numbers = @section_text.scan(UNIT_BEARING).flatten
      DECIMAL_SIGNALS.each do |marks|
        style = signalled_style(numbers, marks)
        return style if style
      end
      :english
    end

    def signalled_style(numbers, marks)
      german, english = marks.map { |mark| numbers.any? { |number| number.match?(mark) } }
      return :ambiguous if german && english
      return :german if german

      english ? :english : nil
    end
  end
end
