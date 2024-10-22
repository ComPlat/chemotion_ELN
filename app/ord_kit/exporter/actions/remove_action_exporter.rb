# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class RemoveActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            removal: OrdKit::ReactionProcessAction::ActionRemove.new(
              { automation: automation }.merge(origin_fields),
            ),
          }
        end

        def automation
          Automation::AutomationMode.const_get workup['automation'].to_s
        rescue NameError
          Automation::AutomationMode::UNSPECIFIED
        end

        def origin_fields
          case workup['origin_type']
          when 'FROM_REACTION'
            { from_reaction: from_reaction_fields }.stringify_keys
          when 'FROM_REACTION_STEP'
            { from_reaction_step: from_reaction_fields }.stringify_keys
          when 'FROM_SAMPLE'
            { from_sample: from_sample_fields }.stringify_keys
          when 'FROM_METHOD'
            from_method_fields
          when 'STEPWISE'
            stepwise_fields
          when 'DIVERSE_SOLVENTS'
            diverse_solvent_fields
          else
            {}
          end
        end

        def from_reaction_fields
          OrdKit::ReactionProcessAction::ActionRemove::FromReaction.new(
            samples: solvents_to_ord(workup['samples'] || []),
            amount: amount_to_ord(workup['amount']),
            solvents: OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(workup['solvents']).to_ord,
            solvents_amount: amount_to_ord(workup['solvents_amount']),
          )
        end

        def from_sample_fields
          OrdKit::ReactionProcessAction::ActionRemove::FromReaction.new(
            samples: solvents_to_ord(workup['samples'] || []),
            amount: amount_to_ord(workup['amount']),
            solvents: OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(workup['solvents']).to_ord,
            solvents_amount: amount_to_ord(workup['solvents_amount']),
          )
        end

        def from_method_fields
          { from_method: {
            starter_conditions: starter_conditions,
            limits: limits_to_ord(workup['remove_steps']),
          } }
        end

        def stepwise_fields
          { stepwise: {
            starter_conditions: starter_conditions,
            limits: limits_to_ord(Array(workup['limits'])),
          } }
        end

        def diverse_solvent_fields
          {
            diverse_solvents: {
              solvents: solvents_with_ratio(workup['solvents']),
              solvents_amount: amount_to_ord(workup['solvents_amount']),
            },
          }
        end

        def starter_conditions
          Conditions::ReactionConditionsExporter.new(workup['starter_conditions']).to_ord
        end

        def limits_to_ord(limits)
          limits&.map do |limit|
            Conditions::ReactionConditionLimitsExporter.new(limit).to_ord
          end
        end

        def solvents_with_ratio(solvents)
          solvents&.map do |solvent|
            OrdKit::CompoundWithRatio.new(
              compound: Compounds::PurificationSampleOrDiverseSolventExporter.new(solvent['id']).to_ord,
              ratio: solvent['ratio'].to_s,
            )
          end
        end

        def solvents_to_ord(solvents)
          Array(solvents).map do |solvent|
            OrdKit::Exporter::Samples::SampleExporter.new(solvent).to_ord
          end
        end

        def amount_to_ord(amount)
          OrdKit::Exporter::Metrics::AmountExporter.new(amount).to_ord
        end
      end
    end
  end
end
