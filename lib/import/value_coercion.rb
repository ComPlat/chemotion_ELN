# frozen_string_literal: true

module Import
  # Turns a spreadsheet cell into a value the samples table accepts, and says what it had to change
  # to get there.
  #
  # Handing a raw cell to a typed Postgres column gives two outcomes: the value is
  # silently mangled, or the statement raises and the whole row is lost.
  # `"120-80"` is a reversed numrange, which Postgres rejects outright, taking every other value in
  # that row down with it.
  #
  # Every method here returns `[value, note]`. A nil note means the cell was used as given. A note
  # means it could not be, and says what happened instead; the importer records those notes per cell
  # and reports them back in the import report workbook.
  #
  # A note is only produced when the stored value is not a faithful reading of the cell. Decoration a
  # column cannot store anyway -- a "°C" on a melting point, a decimal comma -- is dropped silently,
  # because flagging it would turn every row of a German-formatted file amber and bury the cells that
  # genuinely need attention.
  class ValueCoercion
    RANGE_COLUMNS = %w[melting_point boiling_point].freeze
    FLOAT_COLUMNS = %w[purity refractive_index molecular_mass real_amount_value target_amount_value].freeze
    UNIT_COLUMNS = %w[real_amount_unit target_amount_unit].freeze

    VALID_UNITS = %w[g mg µg ug kg l ml µl ul mol mmol].freeze

    # What the samples table already holds for a melting or boiling point. An
    # unreadable one is recorded the same way -- "unknown" -- rather than as a wrong number.
    UNKNOWN_RANGE = "[#{-Float::INFINITY}, #{Float::INFINITY}]"

    # g/cm3 is the same number as g/mL, so it is accepted rather than discarded. The cubic exponent is
    # required: 'g/cm' is not a density and its number means something else, so it has to be reported
    # rather than stored as if it were g/mL.
    DENSITY_UNIT = %r{g\s*/\s*(?:m[lL]|cm[3³])}.freeze

    # NUMBER supports:
    # [-+]?                  - Allows an optional '+' or '-' sign.
    # \d+(?:\.\d+)?         - Matches integers and decimal numbers such as '123' or '123.45'.
    # (?<![\d.])\.\d+       - Matches leading-decimal numbers such as '.5', but not '.4' in '1.23.4'.
    # (?:[eE][-+]?\d+)?     - Allows optional scientific notation such as 'e3', 'e-3', or 'E+3'.
    NUMBER = /[-+]?(?:\d+(?:\.\d+)?|(?<![\d.])\.\d+)(?:[eE][-+]?\d+)?/.freeze
    # U+2212. Spreadsheets and copy-paste substitute it for a hyphen, and it is a real minus sign, so
    # it has to survive as one instead of being read as a range separator.
    MINUS_SIGN = '−'
    RANGE_SEPARATOR = /\s*(?:\.\.\.|\.\.|–|—|~|\bto\b|\bbis\b)\s*/i.freeze
    # Characters a numeric column cannot store but which carry no information either.
    DECORATION = %r{[\s°ºCFK℃/³^.,;:()\[\]+-]}.freeze

    class << self
      # Returns nil when this column needs no coercion; the caller then keeps its existing handling.
      def coerce(db_column, raw)
        case db_column
        when *RANGE_COLUMNS then range(raw)
        when 'purity' then purity(raw)
        when *FLOAT_COLUMNS then float(raw, db_column)
        when *UNIT_COLUMNS then unit(raw)
        when 'density' then density(raw)
        end
      end

      def handles?(db_column)
        RANGE_COLUMNS.include?(db_column) || FLOAT_COLUMNS.include?(db_column) ||
          UNIT_COLUMNS.include?(db_column) || db_column == 'density'
      end

      # A melting or boiling point, as a numrange literal.
      #
      # A single number keeps the open upper bound the ELN has always used for it: the sample form
      # renders `[x, Infinity]` as a bare "x" and `[x, x]` as "x – x" (see prepareRangeBound in
      # app/javascript/src/models/Sample.js), so closing the bound would change how every existing
      # single-valued melting point reads.
      def range(raw)
        text = raw.to_s.strip
        return [UNKNOWN_RANGE, nil] if text.empty?

        numbers = numbers_in(text)
        return [UNKNOWN_RANGE, "could not be read as a number or range, left unset (#{text.inspect})"] if numbers.empty?
        return [range_literal(numbers.first, Float::INFINITY), residual_note(text, numbers)] if numbers.one?

        low, high = numbers.take(2).minmax
        [range_literal(low, high), range_note(text, numbers, low)]
      end

      def purity(raw)
        text = raw.to_s.strip
        return [nil, nil] if text.empty?

        numbers = numbers_in(text)
        return [nil, "purity expects a number, value not used (#{text.inspect})"] if numbers.empty?

        fraction(numbers.first, text)
      end

      # Purity is stored as a fraction and the sample model rejects anything outside 0..1 outright, so
      # a cell written as a percentage -- "95", "99%" -- used to cost the whole row. It is converted
      # instead, and said so. Anything still out of range is dropped, which the column allows.
      def fraction(number, text)
        percentage = text.include?('%')
        return [number, residual_note(text, [number])] if !percentage && number >= 0 && number <= 1
        return [number / 100, "read as the fraction #{number / 100} (#{text.inspect})"] if number.positive? &&
                                                                                           number <= 100

        [nil, "purity has to be between 0 and 1, value not used (#{text.inspect})"]
      end

      # Refractive index, molecular mass, amounts.
      def float(raw, db_column)
        text = raw.to_s.strip
        # Blank means "not given", which is not the same as zero. Leaving the column alone keeps the
        # default the samples table defines for it.
        return [nil, nil] if text.empty?

        numbers = numbers_in(text)
        return [nil, "#{db_column.tr('_', ' ')} expects a number, value not used (#{text.inspect})"] if numbers.empty?

        [numbers.first, residual_note(text, numbers) || extra_numbers_note(text, numbers, 1)]
      end

      # An amount unit. Anything not on the list is dropped: storing a unit the application cannot
      # convert would make every amount displayed for that sample wrong.
      def unit(raw)
        text = raw.to_s.strip
        return [nil, nil] if text.empty?

        # Matched case-insensitively but stored in the canonical spelling: the application compares
        # units case-sensitively, so a "G" that was accepted as-is would convert as if it were unset.
        canonical = VALID_UNITS.find { |valid| valid.casecmp(text).zero? }
        return [canonical, canonical == text ? nil : "unit read as #{canonical.inspect}"] if canonical

        [nil, "not a recognized unit, value not used (#{text.inspect})"]
      end

      # Density is stored in g/mL, so a unit-less number is unambiguous and is taken as given. A cell
      # carrying some other unit is dropped whole, because its number means something else.
      def density(raw)
        text = raw.to_s.strip
        return [nil, nil] if text.empty?

        numbers = numbers_in(text)
        return [nil, "density expects a number, value not used (#{text.inspect})"] if numbers.empty?

        residual = strip_numbers(text.gsub(DENSITY_UNIT, ''))
        return [nil, "density is stored in g/mL, value not used (#{text.inspect})"] unless residual.empty?

        [numbers.first, nil]
      end

      private

      def range_literal(low, high)
        "[#{low}, #{high}]"
      end

      def numbers_in(text)
        normalize(text).scan(NUMBER).map(&:to_f)
      end

      # Decimal commas become dots, so "120,5" reads as 120.5 and not as 120. A hyphen sitting between
      # two digits is a range separator and is split out, so "120-125" is two numbers rather than 120
      # and -125 -- which sorted to a lower bound of -125 and silently recorded the wrong melting
      # point. A hyphen that is not between digits keeps its meaning as a sign, so "-114" and
      # "-5 - -10" still read correctly.
      def normalize(text)
        text.gsub(/(\d),(\d)/, '\1.\2')
            .gsub(MINUS_SIGN, '-')
            .gsub(/(\d)\s*-\s*(?=-?\d)/, '\1 ')
            .gsub(RANGE_SEPARATOR, ' ')
      end

      def range_note(text, numbers, low)
        return "range bounds were the wrong way round, read as #{low} upwards (#{text.inspect})" if reversed?(numbers)

        residual_note(text, numbers) || extra_numbers_note(text, numbers, 2)
      end

      # A malformed number such as "1.23.4-1" scans as three numbers and leaves no words behind, so
      # nothing else here would notice it. Taking the first ones silently would record a range the user
      # never wrote.
      def extra_numbers_note(text, numbers, used)
        return nil if numbers.size <= used

        "#{text.inspect} does not read as a number, only #{numbers.take(used).join(' and ')} was used"
      end

      def reversed?(numbers)
        numbers.size > 1 && numbers.first > numbers[1]
      end

      # Flags a cell whose words were thrown away, so "approx. 80" is reported while "80 °C" is not.
      def residual_note(text, numbers)
        return nil if strip_numbers(text).empty?

        "only the number #{numbers.first} was used, the rest of the cell was ignored (#{text.inspect})"
      end

      def strip_numbers(text)
        normalize(text).gsub(NUMBER, ' ').gsub(DECORATION, '').strip
      end
    end
  end
end
