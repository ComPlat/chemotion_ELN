# frozen_string_literal: true

module Usecases
  module Reactions
    # Numbers and units of reaction variations as the old Variations grid stored them, converted the
    # way the client does - see Usecases::Reactions::ConvertLegacyVariations.
    module LegacyVariationUnits
      MASS_FACTORS = { 'g' => 1, 'mg' => 1e-3, 'μg' => 1e-6 }.freeze
      VOLUME_FACTORS = { 'l' => 1, 'ml' => 1e-3, 'μl' => 1e-6 }.freeze
      AMOUNT_FACTORS = { 'mol' => 1, 'mmol' => 1e-3 }.freeze
      TEMPERATURE_UNITS = ['°C', 'K', '°F'].freeze
      GAS_TIME_UNITS = %w[s m h d w].freeze
      DURATION_UNITS = %w[Second(s) Minute(s) Hour(s) Day(s) Week(s)].freeze
      SECONDS_PER = {
        'Second(s)' => 1, 'Minute(s)' => 60, 'Hour(s)' => 3600, 'Day(s)' => 86_400, 'Week(s)' => 604_800,
        's' => 1, 'm' => 60, 'h' => 3600, 'd' => 86_400, 'w' => 604_800
      }.freeze

      module_function

      # The value of an old `{ value:, unit: }` entry in the standard unit of `factors`.
      def value_in(entry, factors, standard_unit)
        value = number(entry&.dig('value'))
        return nil unless value

        factor = factors[entry['unit'] || standard_unit]
        factor && (value * factor)
      end

      def entry_value(entry)
        number(entry&.dig('value'))
      end

      def number(value)
        return nil if value.nil? || value == ''

        number = Float(value, exception: false)
        number&.finite? ? number : nil
      end

      # JavaScript truthiness of a number: set and not zero.
      def js_truthy?(value)
        number = number(value)
        !number.nil? && !number.zero?
      end

      # Six significant digits, without trailing zeros - as the client's Number(x.toPrecision(6)).
      def display(value)
        format('%.6g', value)
      end

      def convert_temperature(value, from, to)
        kelvin = case from
                 when 'K' then value
                 when '°F' then (value + 459.67) * 5 / 9
                 else value + 273.15
                 end
        case to
        when 'K' then kelvin
        when '°F' then (kelvin * 9 / 5) - 459.67
        else kelvin - 273.15
        end
      end

      def convert_duration(value, from, to)
        return nil unless SECONDS_PER.key?(from) && SECONDS_PER.key?(to)

        value * SECONDS_PER[from] / SECONDS_PER[to].to_f
      end

      # `unit` if it is one of `units`, `fallback` otherwise.
      def unit_or(unit, units, fallback)
        units.include?(unit) ? unit : fallback
      end
    end
  end
end
