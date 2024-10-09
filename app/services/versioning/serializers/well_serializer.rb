# frozen_string_literal: true

module Versioning
  module Serializers
    class WellSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name)
        new(record: record, name: name).call
      end

      def field_definitions
        {
          color_code: {
            label: 'Color Code',
            revert: %i[color_code],
          },
          sample_id: {
            label: 'Sample ID',
            revert: %i[sample_id],
          },
          readouts: {
            label: 'Readouts',
            revert: %i[readouts],
            formatter: array_formatter,
          },
        }.with_indifferent_access
      end
    end
  end
end
