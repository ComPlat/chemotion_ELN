# frozen_string_literal: true

module Versioning
  module Reverters
    class ReactionReverter < Versioning::Reverters::BaseReverter
      def self.scope
        Reaction.with_deleted
      end

      def field_definitions
        {
          variations: handle_json,
        }.with_indifferent_access
      end

      private

      def handle_json
        lambda do |value|
          return [] if value.blank?

          value.split("\n").map { |variation| JSON.parse(variation.gsub('=>', ':').gsub('nil', 'null')) }
        end
      end
    end
  end
end
