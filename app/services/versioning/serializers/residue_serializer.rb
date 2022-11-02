# frozen_string_literal: true

class Versioning::Serializers::ResidueSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name = ['Polymer section'])
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      custom_info: [
        {
          name: 'custom_info.polymer_type',
          label: 'Polymer type',
          formatter: jsonb_formatter('polymer_type'),
          revert: %i[custom_info.polymer_type custom_info.surface_type],
        },
        {
          name: 'custom_info.surface_type',
          label: 'Surface type',
          formatter: jsonb_formatter('surface_type'),
          revert: %i[custom_info.surface_type custom_info.polymer_type],
        },
        {
          name: 'custom_info.cross_linkage',
          label: 'Cross-linkage',
          formatter: jsonb_formatter('cross_linkage'),
          revert: %i[custom_info.cross_linkage],
        },
        {
          name: 'custom_info.formula',
          label: 'Cross-linkage',
          formatter: jsonb_formatter('formula'),
          revert: %i[custom_info.formula],
        },
        {
          name: 'custom_info.loading',
          label: 'Loading (mmol/g)',
          formatter: jsonb_formatter('loading'),
          revert: %i[custom_info.loading],
        },
        {
          name: 'custom_info.loading_type',
          label: 'Loading according to',
          formatter: loading_type_formatter,
          revert: %i[custom_info.loading_type],
        },
      ],
    }.with_indifferent_access
  end

  private

  def loading_type_formatter
    lambda do |key, value|
      value = jsonb_formatter('loading_type').call(key, value)
      {
        'mass_diff' => 'Mass difference',
        'full_conv' => '100% conversion',
        'found' => 'Elemental analyses',
        'external' => 'External estimation',
      }[value]
    end
  end
end
