# frozen_string_literal: true

class Versioning::Serializers::ScreenSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name = ['Screen Properties'])
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      name: {
        label: 'Name',
        revert: %i[name],
      },
      collaborator: {
        label: 'Collaborator',
        revert: %i[collaborator],
      },
      requirements: {
        label: 'Requirements',
        revert: %i[requirements],
      },
      conditions: {
        label: 'Conditions',
        revert: %i[conditions],
      },
      result: {
        label: 'Result',
        revert: %i[result],
      },
      description: {
        label: 'Description',
        kind: :quill,
        revert: %i[description],
      },
    }.with_indifferent_access
  end
end
