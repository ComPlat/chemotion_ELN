# frozen_string_literal: true

# rubocop:disable Metrics/MethodLength

module Versioning
  module Serializers
    class CollectionShareSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Collection share'])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          permission_level: {
            label: 'Permission level',
            formatter: permission_level_formatter,
          },
          sample_detail_level: {
            label: 'Sample detail level',
          },
          reaction_detail_level: {
            label: 'Reaction detail level',
          },
          wellplate_detail_level: {
            label: 'Wellplate detail level',
          },
          screen_detail_level: {
            label: 'Screen detail level',
          },
          researchplan_detail_level: {
            label: 'Research plan detail level',
          },
          celllinesample_detail_level: {
            label: 'Cell line sample detail level',
          },
          devicedescription_detail_level: {
            label: 'Device description detail level',
          },
          sequencebasedmacromoleculesample_detail_level: {
            label: 'Sequence-based macromolecule sample detail level',
          },
          element_detail_level: {
            label: 'Generic element detail level',
          },
        }.with_indifferent_access
      end

      private

      def permission_level_formatter
        lambda do |key, value|
          level = default_formatter.call(key, value)
          CollectionShare::PERMISSION_LEVELS.key(level)&.to_s || level
        end
      end
    end
  end
end
# rubocop:enable Metrics/MethodLength
