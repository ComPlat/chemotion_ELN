# frozen_string_literal: true

module Versioning
  module Serializers
    class WellplateSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Wellplate Properties'])
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
          description: {
            label: 'Description',
            kind: :quill,
            revert: %i[description],
          },
          width: {
            label: 'Width',
          },
          height: {
            label: 'Height',
          },
          readout_titles: {
            label: 'Readout Title',
            revert: %i[readout_titles],
            formatter: array_formatter,
          },
        }.with_indifferent_access
      end
    end
  end
end
