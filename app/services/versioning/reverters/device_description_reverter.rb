# frozen_string_literal: true

module Versioning
  module Reverters
    class DeviceDescriptionReverter < Versioning::Reverters::BaseReverter
      def self.scope
        DeviceDescription.with_deleted
      end

      def json_fields
        @json_fields ||= DeviceDescription.columns.select { |c| c.type == :jsonb }.map(&:name)
      end

      def field_definitions
        json_fields.index_with { handle_json }.with_indifferent_access
      end

      private

      def handle_json
        lambda do |value|
          return [{}] if value.blank?

          begin
            value.split("\n").map { |data| JSON.parse(data.gsub('=>', ':').gsub('nil', 'null')) }
          rescue JSON::ParserError
            [{}]
          end
        end
      end
    end
  end
end
