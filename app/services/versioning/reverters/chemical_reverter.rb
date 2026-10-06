# frozen_string_literal: true

module Versioning
  module Reverters
    class ChemicalReverter < BaseReverter
      def self.scope
        Chemical
      end

      def field_definitions
        {
          chemical_data: handle_json,
        }.with_indifferent_access
      end

      private

      def handle_json
        lambda do |value|
          return [{}] if value.blank?
          return value if value.is_a?(Array) # the stored value, as the history sends it

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
