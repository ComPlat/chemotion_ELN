# frozen_string_literal: true

module Versioning
  module Serializers
    # Material data is shared between all cell line samples using it, so its changes are
    # shown in the sample history but cannot be reverted from there.
    class CelllineMaterialSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ["Cell line material: #{record.name} (#{record.source})"])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          name: { label: 'Cell line name' },
          source: { label: 'Source' },
          disease: { label: 'Disease', formatter: jsonb_text_formatter },
          organism: { label: 'Organism', formatter: jsonb_text_formatter },
          mutation: { label: 'Mutation' },
          variant: { label: 'Variant' },
          tissue: { label: 'Tissue', formatter: jsonb_text_formatter },
          growth_medium: { label: 'Growth medium' },
          biosafety_level: { label: 'Biosafety level' },
          cryo_pres_medium: { label: 'Cryopreservation medium' },
          optimal_growth_temp: { label: 'Opt. growth temperature' },
          gender: { label: 'Gender' },
          cell_type: { label: 'Cell type' },
          description: { label: 'Material Description' },
        }.with_indifferent_access
      end

      private

      # Log entries hold jsonb values already decoded, while the current column value
      # is raw JSON, so decoding is attempted but not required.
      def jsonb_text_formatter
        lambda do |_key, value|
          value = JSON.parse(value) if value.is_a?(String)
          value.is_a?(String) ? value : value&.to_json
        rescue JSON::ParserError
          value
        end
      end
    end
  end
end
