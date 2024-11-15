# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      class TransferCompoundExporter < OrdKit::Exporter::Compounds::Base
        private

        def identifiers
          [OrdKit::CompoundIdentifier.new(
            type: OrdKit::CompoundIdentifier::IdentifierType::UNSPECIFIED, # TODO: hardcoded clarify
            details: details,
            value: value,
          )]
        end

        def details
          return unless action.sample

          action.sample.preferred_label || action.sample.short_label
        end

        def value
          return unless action.sample

          action.sample.name # TODO: inchi? iupac? smiles?
        end

        def reaction_role
          type = ReactionsSample.find_by(reaction: action.reaction, sample: action.sample)&.intermediate_type
          OrdKit::ReactionRole::ReactionRoleType.const_get type.to_s
        rescue NameError
          OrdKit::ReactionRole::ReactionRoleType::UNSPECIFIED
        end

        def amount
          Amount.new(percentage: Metrics::AmountExporter.new(workup['target_amount']).to_ord)
        end

        def preparations
          [
            Preparations::CompoundPreparationsExporter.new(@action).to_ord,
          ].compact
        end

        def compound_source
          OrdKit::Compound::Source.new(
            vendor: nil, # TODO: hardcoded empty. clarify.
            id: nil,
            lot: nil,
          )
        end
      end
    end
  end
end
