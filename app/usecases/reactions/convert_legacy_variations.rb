# frozen_string_literal: true

module Usecases
  module Reactions
    # Writes the values of variations saved before the diff-based format back into their diff.
    #
    # db/migrate/20260731120000_convert_reaction_variations_to_diff_list.rb converted the old rows
    # without touching their values: each converted row has a diff naming nothing but its identity
    # and keeps its former body under `legacy_data`. This turns that body into the diff the client
    # would write for the same values, so everything reading variations on the server - the docx
    # report, the API - sees them without the reaction having to be opened and saved first.
    #
    # It mirrors app/javascript/src/apps/mydb/elements/details/reactions/variationsTab/
    # ReactionVariationsLegacyConversion.js, which still converts on the client whatever is left
    # (rows this found nothing to write for), and writes the same keys: the diff is expressed in the
    # attribute names of the client side Reaction and Sample models, which is why they are underscore
    # prefixed. Material lists are positional and as long as the reaction's own, since the client
    # sizes a variation's material list by its diff - see db/schemas/reaction_variations.schema.json.
    #
    # Not written, as on the client: concentrations (derived from amount and reaction volume), the
    # read-only `aux` block, materials no longer in the reaction, SBMM reactants, and fields of
    # segments the reaction does not have.
    class ConvertLegacyVariations
      MATERIAL_GROUPS = {
        'startingMaterials' => %w[starting_materials reactions_starting_material_samples],
        'reactants' => %w[reactants reactions_reactant_samples],
        'products' => %w[products reactions_product_samples],
        'solvents' => %w[solvents reactions_solvent_samples],
      }.freeze

      include LegacyVariationUnits

      # A row the migration left as it was: legacy body, and nothing in the diff beyond its identity.
      def self.pending?(variation)
        variation.is_a?(Hash) && variation['legacy_data'].is_a?(Hash) &&
          (variation['data'] || {}).keys.all?('id')
      end

      def initialize(reaction)
        @reaction = reaction
      end

      # Converts every pending variation of the reaction and stores the result without touching
      # anything else about the reaction. Returns the number of variations converted.
      def perform!
        variations = @reaction.variations
        converted = variations.select { |variation| self.class.pending?(variation) }.count do |variation|
          diff = legacy_diff(variation)
          variation['data'] = diff if diff
          diff
        end
        # rubocop:disable Rails/SkipsModelValidations
        @reaction.update_column(:variations, variations) if converted.positive?
        # rubocop:enable Rails/SkipsModelValidations
        converted
      end

      private

      # The diff for the old body of `variation`, or nil when there is nothing in it to write.
      def legacy_diff(variation)
        legacy = variation['legacy_data']
        diff = { 'id' => (variation['data'] || {})['id'] }.compact
        diff.merge!(material_diffs(legacy))
        diff.merge!(temperature_diff(legacy.dig('properties', 'temperature')))
        diff.merge!(duration_diff(legacy.dig('properties', 'duration')))
        diff.merge!(segment_diff(legacy['segments']))
        diff.keys.all?('id') ? nil : diff
      end

      # Materials

      def material_diffs(legacy)
        MATERIAL_GROUPS.each_with_object({}) do |(legacy_key, (group, association)), diff|
          entries = legacy[legacy_key]
          next unless entries.is_a?(Hash)

          list = material_rows(association).map do |row|
            material_diff(row, entries[row.sample_id.to_s], group)
          end
          diff["_#{group}"] = list if list.any?
        end
      end

      def material_rows(association)
        @material_rows ||= {}
        @material_rows[association] ||= @reaction.public_send(association).includes(:sample).to_a
      end

      def material_diff(row, material, group)
        return nil unless material.is_a?(Hash) && row.sample

        gas_type = material.dig('aux', 'gasType') || row.gas_type || 'off'
        entry = gas_type == 'gas' ? gas_material_diff(row, material) : amount_material_diff(row, material, group)
        entry.merge!(equivalent_diff(row, material, group, gas_type))
        entry.presence
      end

      def gas_material_diff(row, material)
        entry = {}
        gas_phase_data = gas_phase_diff(row.gas_phase_data || {}, material)
        entry['_gas_phase_data'] = gas_phase_data if gas_phase_data.any?
        amount = value_in(material['amount'], AMOUNT_FACTORS, 'mol')
        entry.merge!(amount_diff(row.sample, amount, 'mol')) if amount
        entry
      end

      def amount_material_diff(row, material, group)
        value, unit = legacy_amount(material, stored_amount_unit(row, material, group))
        value ? amount_diff(row.sample, value, unit) : {}
      end

      def stored_amount_unit(row, material, group)
        return 'l' if group == 'solvents'
        return 'mol' if material.dig('aux', 'gasType') == 'feedstock' || row.gas_type == 'feedstock'

        amount_unit(row.sample)
      end

      # The client keeps a product's yield, gas products included, as a fraction in `equivalent`. The
      # reference material's equivalent is not the variation's to change.
      def equivalent_diff(row, material, group, gas_type)
        if group == 'products' || gas_type == 'gas'
          yield_value = entry_value(material['yield'])
          return yield_value ? { '_equivalent' => yield_value / 100.0 } : {}
        end

        equivalent = entry_value(material['equivalent'])
        equivalent && !row.reference ? { '_equivalent' => equivalent } : {}
      end

      # A sample keeps one amount, in g, l or mol, and derives the other two. The unit the reaction's
      # sample uses is kept, so the scheme keeps showing the field the user entered.
      def legacy_amount(material, unit)
        candidates = {
          'g' => value_in(material['mass'], MASS_FACTORS, 'g'),
          'l' => value_in(material['volume'], VOLUME_FACTORS, 'l'),
          'mol' => value_in(material['amount'], AMOUNT_FACTORS, 'mol'),
        }
        return [candidates[unit], unit] if candidates[unit]

        candidates.find { |_, value| value }&.reverse
      end

      # The client's Sample#amountType: the target amount while only that is set, the real one otherwise.
      def real_amount?(sample)
        !(js_truthy?(sample.target_amount_value) && !js_truthy?(sample.real_amount_value))
      end

      def amount_unit(sample)
        unit = real_amount?(sample) ? sample.real_amount_unit : sample.target_amount_unit
        unit.presence || 'g'
      end

      def amount_diff(sample, value, unit)
        prefix = real_amount?(sample) ? '_real_amount' : '_target_amount'
        { "#{prefix}_value" => value, "#{prefix}_unit" => unit }
      end

      def gas_phase_diff(parent, material)
        diff = {}
        ppm = entry_value(material['concentration'])
        diff['part_per_million'] = ppm if ppm
        ton = entry_value(material['turnoverNumber'])
        diff['turnover_number'] = ton if ton
        # The old grid computed TOF per hour, which is the unit the client defaults to.
        tof = entry_value(material['turnoverFrequency'])
        diff['turnover_frequency'] = { 'unit' => 'TON/h', 'value' => tof } if tof
        diff.merge!(gas_temperature_diff(parent, material['temperature']))
        diff.merge!(gas_time_diff(parent, material['duration']))
      end

      def gas_temperature_diff(parent, entry)
        value = entry_value(entry)
        return {} unless value

        unit = unit_or(parent.dig('temperature', 'unit'), TEMPERATURE_UNITS, 'K')
        converted = convert_temperature(value, entry['unit'] || '°C', unit)
        { 'temperature' => { 'unit' => unit, 'value' => display(converted).to_f } }
      end

      def gas_time_diff(parent, entry)
        value = entry_value(entry)
        return {} unless value

        unit = unit_or(parent.dig('time', 'unit'), GAS_TIME_UNITS, 'h')
        converted = convert_duration(value, entry['unit'] || 'Second(s)', unit)
        converted ? { 'time' => { 'unit' => unit, 'value' => display(converted).to_f } } : {}
      end

      # Reaction properties

      def temperature_diff(entry)
        value = entry_value(entry)
        return {} unless value

        unit = unit_or((@reaction.temperature || {})['valueUnit'], TEMPERATURE_UNITS, '°C')
        converted = convert_temperature(value, entry['unit'] || '°C', unit)
        { '_temperature' => { 'valueUnit' => unit, 'userText' => display(converted) } }
      end

      # Shown in the unit the reaction uses, as the duration input of the scheme would.
      def duration_diff(entry)
        value = entry_value(entry)
        return {} unless value

        unit = unit_or(@reaction.duration.to_s[/\d+\.?\d*\s+([\w()]+)/, 1], DURATION_UNITS, 'Hour(s)')
        converted = convert_duration(value, entry['unit'] || 'Second(s)', unit)
        return {} unless converted

        text = display(converted)
        {
          '_duration' => "#{text} #{unit}",
          '_durationDisplay' => { 'dispUnit' => unit, 'memUnit' => unit, 'dispValue' => text, 'memValue' => text },
        }
      end

      # Segments: positional like the materials, down to the fields of a layer.

      def segment_diff(legacy_segments)
        return {} unless legacy_segments.is_a?(Hash) && legacy_segments.any?

        segments = @reaction.segments.to_a
        list = segments.map do |segment|
          fields = legacy_segments[segment.segment_klass&.label]
          fields.is_a?(Hash) ? single_segment_diff(segment, fields) : nil
        end
        list.any? ? { '_segments' => list } : {}
      end

      def single_segment_diff(segment, legacy_fields)
        layers = segment.properties&.dig('layers') || {}
        diff = layers.to_h { |layer_key, layer| [layer_key, layer_diff(legacy_fields, layer_key, layer)] }.compact
        diff.any? ? { 'properties' => { 'layers' => diff } } : nil
      end

      def layer_diff(legacy_fields, layer_key, layer)
        fields = (layer['fields'] || []).map { |field| field_diff(legacy_fields, layer_key, field) }
        fields.any? ? { 'fields' => fields } : nil
      end

      def field_diff(legacy_fields, layer_key, field)
        entry = legacy_fields["layer<#{layer_key}>field<#{field['field']}>"]
        return nil unless entry.is_a?(Hash) && !entry['value'].nil?

        { 'value' => entry['value'], 'value_system' => entry['unit'] }.compact
      end
    end
  end
end
