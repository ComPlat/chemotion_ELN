# frozen_string_literal: true

module Versioning
  module Serializers
    class LiteralSerializer < Versioning::Serializers::BaseSerializer
      LITYPE_LABELS = {
        'citedOwn' => 'cited own work',
        'citedRef' => 'cited reference',
        'referTo' => 'referring to',
        'literatureOfSource' => 'literature from source',
        'additionalLiterature' => 'additional literature',
      }.freeze

      def self.call(record, name)
        new(record: record, name: name).call
      end

      def field_definitions
        {
          litype: {
            label: 'Type',
            formatter: ->(_key, value) { LITYPE_LABELS.fetch(value, value) },
            revert: %i[litype],
            revertible_value_formatter: default_formatter,
          },
          deleted_at: {
            label: 'Deleted',
            kind: :boolean,
            formatter: ->(_key, value) { value.present? },
            revert: %i[deleted_at],
            revertible_value_formatter: default_formatter,
          },
        }.with_indifferent_access
      end
    end
  end
end
