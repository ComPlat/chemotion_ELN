# frozen_string_literal: true

module OrdKit
  module Exporter
    module Samples
      class SampleExporter
        def initialize(sample)
          @sample = sample
        end

        def to_ord
          OrdKit::Compound.new(
            identifiers: identifiers, #   repeated :identifiers, :message, 1, "ord.CompoundIdentifier"
            amount: nil, #  optional :amount, :message, 2, "ord.Amount"
            reaction_role: reaction_role, #   optional :reaction_role, :enum, 3, "ord.ReactionRole.ReactionRoleType"
            preparations: nil, #   repeated :preparations, :message, 5, "ord.CompoundPreparation"
            source: nil, #   optional :source, :message, 6, "ord.Compound.Source"
            features: nil, #   map :features, :string, :message, 7, "ord.Data"
            analyses: nil, #   map :analyses, :string, :message, 8, "ord.Analysis",
            purity: nil,
          )
        end

        private

        attr_reader :sample

        def identifiers
          [OrdKit::CompoundIdentifier.new(
            type: OrdKit::CompoundIdentifier::IdentifierType::UNSPECIFIED, # TODO: hardcoded clarify
            value: @sample['label'],
          )]
        end

        def reaction_role
          OrdKit::ReactionRole::ReactionRoleType.const_get @sample['acts_as'].to_s
        rescue NameError
          OrdKit::ReactionRole::ReactionRoleType::UNSPECIFIED
        end
      end
    end
  end
end
