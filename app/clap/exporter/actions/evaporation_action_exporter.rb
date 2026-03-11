# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class EvaporationActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            evaporation: Clap::ReactionProcessAction::ActionEvaporation.new(evaporation_fields_per_origin),
          }
        end

        # rubocop:disable Metrics/CyclomaticComplexity
        def evaporation_fields_per_origin
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
          when 'SOLVENT_FROM_FRACTION'
            solvent_from_fraction_fields
          else
            {}
          end
        end
        # rubocop:enable Metrics/CyclomaticComplexity

        def from_reaction_fields
          Clap::ReactionProcessAction::ActionEvaporation::FromReaction.new(
            samples: solvents_to_clap(workup['samples'] || []),
            amount: amount_to_clap(workup['amount']),
            solvents: solvents_with_ratio(workup['solvents']),
            solvents_amount: amount_to_clap(workup['solvents_amount']),
          )
        end

        def from_sample_fields
          Clap::ReactionProcessAction::ActionEvaporation::FromReaction.new(
            samples: solvents_to_clap(workup['samples'] || []),
            amount: amount_to_clap(workup['amount']),
            solvents: solvents_with_ratio(workup['solvents']),
            solvents_amount: amount_to_clap(workup['solvents_amount']),
          )
        end

        def from_method_fields
          { from_method: {
            starter_conditions: starter_conditions,
            limits: limits_to_clap(workup['remove_steps']),
          } }
        end

        def stepwise_fields
          { stepwise: {
            starter_conditions: starter_conditions,
            limits: limits_to_clap([workup['limits']]),
          } }
        end

        def diverse_solvent_fields
          {
            diverse_solvents: {
              solvents: solvents_with_ratio(workup['solvents']),
              solvents_amount: amount_to_clap(workup['solvents_amount']),
            },
          }
        end

        def solvent_from_fraction_fields
          {
            solvent_from_fraction_fields: {
              sample: solvents_with_ratio(workup['samples']&.first),
              solvents_amount: amount_to_clap(workup['amount']),
            },
          }
        end

        def starter_conditions
          Conditions::ReactionConditionsExporter.new(workup['starter_conditions']).to_clap
        end

        def limits_to_clap(limits)
          limits&.map do |limit|
            Conditions::ReactionConditionLimitsExporter.new(limit).to_clap
          end
        end

        def solvents_with_ratio(solvents)
          Clap::Exporter::Samples::SolventsWithRatioExporter.new(solvents).to_clap
        end

        def solvents_to_clap(solvents)
          Array(solvents).map do |solvent|
            Clap::Sample.new(label: solvent['label'])
          end
        end

        def amount_to_clap(amount)
          Clap::Exporter::Metrics::AmountExporter.new(amount).to_clap
        end
      end
    end
  end
end
