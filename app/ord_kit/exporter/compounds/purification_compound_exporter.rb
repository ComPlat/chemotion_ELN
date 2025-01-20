# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      class PurificationCompoundExporter
        def initialize(sample)
          @sample = sample
        end

        def to_ord
          OrdKit::Compound.new(
            identifiers: identifiers, #   repeated :identifiers, :message, 1, "ord.CompoundIdentifier"
            amount: nil, #  optional :amount, :message, 2, "ord.Amount"
            reaction_role: reaction_role, #   optional :reaction_role, :enum, 3, "ord.ReactionRole.ReactionRoleType"
            preparations: nil, #   repeated :preparations, :message, 5, "ord.CompoundPreparation"
            purity: nil,
          )
        end

        private

        attr_reader :sample

        def identifiers
          [OrdKit::CompoundIdentifier.new(
            type: OrdKit::CompoundIdentifier::IdentifierType::UNSPECIFIED, # TODO: hardcoded clarify
            details: sample&.name,
            value: sample&.preferred_label || sample&.short_label || 'No label (data missing)',
          )]
        end

        def reaction_role
          OrdKit::ReactionRole::ReactionRoleType::SOLVENT
        end
      end
    end
  end
end
