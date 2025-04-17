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
          sample&.name || 'Error: Save Sample not found, no details available'
        end

        def value
          sample&.preferred_label || sample&.short_label || 'Error: Save Sample not found, name not available'
        end

        def reaction_role
          intermediate_type = ReactionsSample.find_by(reaction: reaction, sample: sample)&.intermediate_type
          if intermediate_type
            OrdKit::ReactionRole::ReactionRoleType.const_get(intermediate_type)
          else
            OrdKit::ReactionRole::ReactionRoleType::UNSPECIFIED
          end
        rescue NameError
          OrdKit::ReactionRole::ReactionRoleType::UNSPECIFIED
        end

        def amount
          Metrics::AmountExporter.new(workup['target_amount']).to_ord
        end

        def preparations
          nil # n/a. Action SAVE has no sample preparations.
        end
      end
    end
  end
end
