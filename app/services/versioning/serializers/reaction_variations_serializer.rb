# frozen_string_literal: true

module Versioning
  module Serializers
    # The variations of a reaction, as an entry of their own in the History tab, shown as a table rather than
    # the stored JSON. A variation stores only what it changes about the reaction
    # (db/schemas/reaction_variations.schema.json), so each row lists those changes, one per line.
    class ReactionVariationsSerializer < BaseSerializer
      COLUMNS = [
        { colId: 'idx', headerName: 'ID' },
        { colId: 'group', headerName: 'Group' },
        { colId: 'notes', headerName: 'Notes' },
        { colId: 'changes', headerName: 'Changes' },
      ].freeze

      # The material collections of a diff, by the name a material of the collection is shown with.
      MATERIAL_COLLECTIONS = {
        'starting_materials' => 'Starting material',
        'reactants' => 'Reactant',
        'solvents' => 'Solvent',
        'purification_solvents' => 'Purification solvent',
        'products' => 'Product',
      }.freeze

      # What a diff holds that says nothing to the reader: identities, and the units the grid displays in.
      IGNORED_KEYS = %w[id metrics].freeze

      # Shown in the material's label rather than among its changes.
      MATERIAL_LABEL_KEYS = %w[name external_label].freeze

      QUILL_KEYS = %w[description observation].freeze
      QUILL_TEXT_LENGTH = 100

      def self.call(record, name = ['Variations'])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          variations: {
            label: 'Variations',
            revert: %i[variations],
            formatter: variations_formatter,
            revertible_value_formatter: default_formatter,
            kind: :json,
          },
        }.with_indifferent_access
      end

      private

      def cache_namespace
        'versions/variations'
      end

      # The shape VersionsTableFields.js renders as a table: a list of sections, each a list of parts.
      def variations_formatter
        lambda do |key, value|
          variations = Usecases::Reactions::NormalizeVariations.call(default_formatter.call(key, value))
          next [] if variations.empty?

          [[{ title: nil, kind: 'table', content: { columns: COLUMNS, rows: variations.map { |v| row(v) } } }]]
        end
      end

      def row(variation)
        {
          idx: variation['idx'],
          group: Array(variation['group']).join('.'),
          notes: variation['notes'].to_s,
          changes: changes(variation).join("\n"),
        }
      end

      def changes(variation)
        diff = unprefixed(variation['data']).except(*IGNORED_KEYS)
        return ['(old format)'] if diff.empty? && variation['legacy_data'].present?

        # The reaction's own fields first, then its materials, in the order the Variations tab shows them.
        materials, fields = diff.partition { |key, _value| MATERIAL_COLLECTIONS.key?(key) }.map(&:to_h)
        fields.map { |key, value| "#{key.humanize}: #{attribute_text(key, value)}" } +
          MATERIAL_COLLECTIONS.keys.flat_map { |key| material_lines(key, materials[key]) }
      end

      def attribute_text(key, value)
        return temperature_text(value) if key == 'temperature' && value.is_a?(Hash)
        return quill_text(value) if QUILL_KEYS.include?(key)

        value_text(value)
      end

      def temperature_text(temperature)
        values = Array(temperature['data']).filter_map { |point| point.is_a?(Hash) ? point['value'] : nil }
        text = temperature['userText'].presence || (values.empty? ? nil : "#{values.min} ~ #{values.max}")
        unit = temperature['valueUnit'].presence || record.temperature.to_h['valueUnit']
        [text, unit].compact.join(' ')
      end

      def quill_text(delta)
        ops = delta.is_a?(Hash) ? Array(delta['ops']) : []
        ops.filter_map { |op| op['insert'] if op.is_a?(Hash) && op['insert'].is_a?(String) }
           .join.squish.truncate(QUILL_TEXT_LENGTH)
      end

      # A material collection of a diff is positional: entry i is material i of the reaction, null where that
      # material is unchanged; entries past the reaction's own materials are whole samples only the variation has.
      def material_lines(collection, materials)
        Array(materials).each_with_index.filter_map do |material, index|
          next unless material.is_a?(Hash)

          attributes = material_attributes(material, collection == 'products')
          next if attributes.empty?

          "#{MATERIAL_COLLECTIONS[collection]} #{index + 1}#{material_label(collection, material, index)}: " \
            "#{attributes.join(', ')}"
        end
      end

      # Pairs like _real_amount_value and _real_amount_unit are shown as one amount.
      def material_attributes(material, is_product)
        material = unprefixed(material)
        material.except(*IGNORED_KEYS, *MATERIAL_LABEL_KEYS).filter_map do |key, value|
          next if key.end_with?('_unit')
          next "yield: #{yield_text(value)} %" if is_product && key == 'equivalent'

          name = key.delete_suffix('_value')
          unit = material["#{name}_unit"] if name != key
          "#{name.humanize(capitalize: false)}: #{[value_text(value), unit].compact.join(' ')}"
        end
      end

      # The client keeps a product's yield as a fraction in `equivalent`.
      def yield_text(equivalent)
        fraction = Float(equivalent, exception: false)
        value_text(fraction ? fraction * 100 : equivalent)
      end

      # The client's models keep a leading underscore on every attribute they wrap in an accessor.
      def unprefixed(hash)
        (hash || {}).transform_keys { |key| key.to_s.delete_prefix('_') }
      end

      def material_label(collection, material, index)
        label = material['name'].presence || material['external_label'].presence ||
                reaction_material_labels(collection)[index]
        label.present? ? " (#{label})" : ''
      end

      # The reaction's materials as they are now - the history doesn't keep what they were.
      def reaction_material_labels(collection)
        @reaction_material_labels ||= {}
        @reaction_material_labels[collection] ||= record.public_send(collection).map { |s| sample_label(s) }
      end

      def sample_label(sample)
        [sample.short_label, sample.name, sample.external_label, sample.molecule&.iupac_name].find(&:present?)
      end

      def value_text(value)
        case value
        when Hash
          return [value_text(value['value']), value['unit']].compact.join(' ') if value.key?('value')

          value.map { |key, sub_value| "#{key.to_s.humanize(capitalize: false)}: #{value_text(sub_value)}" }.join(', ')
        when Array then value.map { |item| value_text(item) }.join(', ')
        when Float then value.round(6).to_s.delete_suffix('.0')
        else value.to_s
        end
      end
    end
  end
end
