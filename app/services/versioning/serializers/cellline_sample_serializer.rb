# frozen_string_literal: true

module Versioning
  module Serializers
    class CelllineSampleSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Cellline Sample Properties'])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          cellline_material_id: {
            label: 'Cell line',
            formatter: material_formatter,
          },
          amount: {
            label: 'Amount',
            revert: %i[amount],
          },
          unit: {
            label: 'Unit',
            revert: %i[unit],
          },
          passage: {
            label: 'Passage',
            revert: %i[passage],
          },
          contamination: {
            label: 'Contamination',
            revert: %i[contamination],
          },
          name: {
            label: 'Name of specific probe',
            revert: %i[name],
          },
          description: {
            label: 'Sample Description',
            revert: %i[description],
          },
        }.with_indifferent_access
      end

      private

      def material_formatter
        lambda do |_key, value|
          next if value.blank?

          material = CelllineMaterial.with_deleted.find_by(id: value)
          material ? "#{material.name} (#{material.source})" : value
        end
      end
    end
  end
end
