# frozen_string_literal: true

class Versioning::Serializers::ElementalCompositionSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name = ['Elemental composition'])
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      data: {
        label: ::ElementalComposition::TYPES[record.composition_type.to_sym],
        formatter: data_formatter,
        revert: (record.composition_type == 'found' ? %i[data] : []),
        revertible_value_formatter: default_formatter,
      },
    }.with_indifferent_access
  end

  private

  def data_formatter
    lambda do |key, value|
      value = fix_malformed_value_formatter.call(key, value)
      return '' if value.blank?

      value.map { |k, v| "#{k}: #{v}" }.join(', ')
    end
  end
end
