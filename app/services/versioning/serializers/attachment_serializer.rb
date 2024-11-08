# frozen_string_literal: true

class Versioning::Serializers::AttachmentSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name)
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      filename: {
        label: 'Filename',
      },
      id: {
        label: 'Preview',
        kind: :image,
        formatter: ->(_key, value) { value ? "/api/v1/attachments/image/#{value}" : '' },
      },
    }.with_indifferent_access
  end
end
