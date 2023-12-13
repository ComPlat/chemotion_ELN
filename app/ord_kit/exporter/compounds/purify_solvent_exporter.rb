# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      class PurifySolventExporter
        def initialize(sample_id)
          # Not optimal. We have 2 types of solvents: Samples, PurificationSolvents
          # As NJung explicitly requested to have them joined in one UI select,
          # they are joined together in ReactionProcessStepEntity#materials_options
          # and consequently the ids of 2 different actions are stored in a single array.
          # Maybe there is a better way as this creates some issues.
          # We need to .find in multiple actions (PurificationSolvents have uuid, so sort of ok)

          @sample = Sample.find_by(id: sample_id) || Medium::DiverseSolvent.find_by(id: sample_id)
        end

        def to_ord
          OrdKit::Compound.new(
            identifiers: identifiers, #   repeated :identifiers, :message, 1, "ord.CompoundIdentifier"
            amount: nil, #  optional :amount, :message, 2, "ord.Amount"
            reaction_role: reaction_role, #   optional :reaction_role, :enum, 3, "ord.ReactionRole.ReactionRoleType"
            is_limiting: nil, #   proto3_optional :is_limiting, :bool, 4 # TODO hardcoded empty
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
            details: sample.name,
            value: sample.preferred_label || sample.short_label,
          )]
        end

        def reaction_role
          OrdKit::ReactionRole::ReactionRoleType::SOLVENT
        end
      end
    end
  end
end
