# frozen_string_literal: true

module Versioning
  module Reverters
    class ReactionReverter < Versioning::Reverters::BaseReverter
      def self.scope
        Reaction.with_deleted
      end

      # A version may hold nothing, or the object the column held before the diff-based format: the
      # value is brought into the list format here (Reaction#normalize_variations does so again on save).
      # The values of such old rows are then converted into diffs, as the migration that introduced the
      # format did.
      def call
        super
        return unless fields.any? { |field| field['name'].to_s == 'variations' }

        Usecases::Reactions::ConvertLegacyVariations.new(record.reload).perform!
      end

      def field_definitions
        {
          variations: ->(value) { Usecases::Reactions::NormalizeVariations.call(value) },
        }.with_indifferent_access
      end
    end
  end
end
