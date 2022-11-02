# frozen_string_literal: true

class Versioning::Serializers::ContainerSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name)
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      deleted_at: {
        label: 'Deleted',
        kind: :boolean,
        formatter: ->(_key, value) { value.present? },
        revert: %i[deleted_at],
        revertible_value_formatter: default_formatter,
      },
      name: {
        label: 'Name',
        revert: %i[name],
      },
      description: {
        label: 'Description',
        revert: %i[description],
      },
      extended_metadata: [
        {
          name: 'extended_metadata.content',
          label: 'Content',
          kind: :quill,
          formatter: lambda { |key, value|
            value = fix_malformed_value_formatter.call(key, value)
            JSON.parse(jsonb_formatter('content').call(key, value) || '{}')
          },
          revert: %i[extended_metadata.content],
          revertible_value_formatter: lambda { |key, value|
            value = fix_malformed_value_formatter.call(key, value)
            jsonb_formatter('content').call(key, value) || '{}'
          },
        },
        # buggy
        # {
        #   name: 'extended_metadata.index',
        #   label: 'Position',
        #   formatter: jsonb_formatter('index'),
        # },
        {
          name: 'extended_metadata.report',
          label: 'Add to Report',
          kind: :boolean,
          revert: %i[extended_metadata.report],
          formatter: ->(key, value) { jsonb_formatter('report').call(key, value) == 'true' },
        },
        {
          name: 'extended_metadata.status',
          label: 'Status',
          revert: %i[extended_metadata.status],
          formatter: jsonb_formatter('status'),
        },
        {
          name: 'extended_metadata.kind',
          label: 'Type',
          revert: %i[extended_metadata.kind],
          formatter: jsonb_formatter('kind'),
        },
        {
          name: 'extended_metadata.hyperlinks',
          label: 'Hyperlinks',
          formatter: lambda { |key, value|
            result = jsonb_formatter('hyperlinks').call(key, value)
            return '' if result.blank?

            JSON.parse(result).join("\n")
          },
          revert: %i[extended_metadata.hyperlinks],
          revertible_value_formatter: ->(key, value) { JSON.parse(jsonb_formatter('hyperlinks').call(key, value) || '[]') },
        },
        {
          name: 'extended_metadata.instrument',
          label: 'Instrument',
          revert: %i[extended_metadata.instrument],
          formatter: jsonb_formatter('instrument'),
        },
      ],
    }.with_indifferent_access
  end
end
