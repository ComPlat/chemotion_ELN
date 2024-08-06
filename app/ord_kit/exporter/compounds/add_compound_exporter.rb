# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      class AddCompoundExporter < OrdKit::Exporter::Compounds::Base
        private

        def identifiers
          [OrdKit::CompoundIdentifier.new(
            type: OrdKit::CompoundIdentifier::IdentifierType::UNSPECIFIED, # TODO: hardcoded clarify
            details: details,
            value: value,
          )]
        end

        def details
          if action.sample?
            action.sample.name # TODO: inchi? iupac? smiles?
          elsif action.medium?
            action.medium.sample_name
          end
        end

        def value
          if action.sample?
            action.sample.preferred_label || action.sample.short_label
          elsif action.medium?
            action.medium.label
          end
        end

        def reaction_role
          OrdKit::ReactionRole::ReactionRoleType.const_get workup['acts_as'].to_s
        rescue NameError
          OrdKit::ReactionRole::ReactionRoleType::UNSPECIFIED
        end

        def amount
          OrdKit::Exporter::Metrics::AmountExporter.new(workup['target_amount']).to_ord
        end

        def percentage
          OrdKit::Exporter::Metrics::Amounts::PercentageExporter.new(
            { value: workup.dig('target_amount', 'percentage') }.stringify_keys,
          ).to_ord
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
