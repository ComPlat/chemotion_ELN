# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      class SaveCompoundExporter < OrdKit::Exporter::Compounds::Base
        private

        delegate :sample, :reaction, :workup, to: :action

        def identifiers
          [OrdKit::CompoundIdentifier.new(
            type: OrdKit::CompoundIdentifier::IdentifierType::UNSPECIFIED, # TODO: hardcoded clarify
            details: details,
            value: value,
          )]
        end

        def details
          sample.name
        end

        def value
          sample.preferred_label || sample.short_label
        end

        def reaction_role
          type = ReactionsSample.find_by(reaction: reaction, sample: sample)&.intermediate_type
          type ? OrdKit::ReactionRole::ReactionRoleType.const_get(type) : OrdKit::ReactionRole::ReactionRoleType::UNSPECIFIED
        rescue NameError
          OrdKit::ReactionRole::ReactionRoleType::UNSPECIFIED
        end

        def amount
          Metrics::AmountExporter.new(workup['target_amount']).to_ord
        end

        def preparations
          nil # n/a. Action SAVE has no preparations.
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
