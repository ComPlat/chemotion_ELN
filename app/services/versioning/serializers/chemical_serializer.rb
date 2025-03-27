# frozen_string_literal: true

module Versioning
  module Serializers
    class ChemicalSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Properties'])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          chemical_data: {
            label: 'Chemical Data',
            revert: %i[chemical_data],
            formatter: array_formatter,
          },
        }.with_indifferent_access
      end
    end
  end
end
