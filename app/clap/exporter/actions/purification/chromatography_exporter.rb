# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module Purification
        class ChromatographyExporter < Actions::Base
          private

          def action_type_attributes
            { chromatography: Clap::ReactionProcessAction::ActionChromatography.new(
              {
                stationary_phase: workup['stationary_phase'],
                steps: steps,
                fractions: fractions,
                molecular_entities: molecular_entities,
                samples: samples,
              }.merge(automation_specific_fields),
            ) }
          end

          def molecular_entities
            Array(workup['molecular_entities']).map do |sample|
              Clap::Sample.new(
                label: sample['label'],
              )
            end
          end

          def samples
            Array(workup['samples']).map do |sample|
              Clap::Sample.new(label: sample['label'])
            end
          end

          def fractions
            action.fractions.map do |fraction|
              Clap::Exporter::Samples::FractionExporter.new(fraction).to_clap
            end
          end

          def automation_mode_ontology
            ReactionProcessEditor::Ontology.find_by(ontology_id: action.reaction_process_step.automation_mode)
          end

          def automation_mode_manual?
            # TODO: Guess we need some "OntologyConstants" or something. cbuggle, 30.12.2025.
            ['NCIT:C63513'].include?(automation_mode_ontology&.ontology_id)
          end

          def automation_mode_automated?
            ['NCIT:C172484', 'NCIT:C70669'].include?(automation_mode_ontology&.ontology_id)
          end

          def automation_specific_fields
            return automation_manual_fields if automation_mode_manual?
            return automation_automated_fields if automation_mode_automated?

            {}
          end

          def automation_manual_fields
            {
              material: ontology_to_clap(workup['jar_material']),
              diameter: Metrics::LengthExporter.new(workup['jar_diameter']).to_clap,
              height: Metrics::LengthExporter.new(workup['jar_height']).to_clap,
              filling_height: Metrics::LengthExporter.new(workup['jar_filling_height']).to_clap,
            }
          end

          def automation_automated_fields
            {
              detectors: detectors,
              mobile_phase: mobile_phase_ontologies(workup['mobile_phase']),
              stationary_phase_temperature: stationary_phase_temperature,
              inject_volume: inject_volume,
            }
          end

          def mobile_phase_ontologies(ontology_ids)
            ontology_ids&.map { |ontology_id| ontology_to_clap(ontology_id) }
          end

          def detectors
            workup['detector']&.map do |detector_ontology_id|
              Clap::Exporter::Models::DetectorExporter.new(detector_ontology_id: detector_ontology_id,
                                                           conditions: workup.dig(
                                                             'detector_conditions', detector_ontology_id
                                                           )).to_clap
            end
          end

          def steps
            Array(workup['purification_steps']).map do |chromatography_step|
              Clap::ReactionProcessAction::ActionChromatography::ChromatographyStep.new(
                solvents: solvents(chromatography_step),
                amount: Metrics::AmountExporter.new(chromatography_step['amount']).to_clap,
                step: clap_step(chromatography_step['step_mode']),
                prod: clap_prod(chromatography_step['prod_mode']),
                flow_rate: Metrics::FlowRateExporter.new(chromatography_step['flow_rate']).to_clap,
                duration: Metrics::TimeSpanExporter.new(chromatography_step['duration']).to_clap,
              )
            end
          end

          def stationary_phase_temperature
            return unless workup['stationary_phase_temperature']

            Clap::Exporter::Conditions::TemperatureControlExporter.new(
              workup['stationary_phase_temperature'],
            ).to_clap
          end

          def inject_volume
            Clap::Exporter::Metrics::Amounts::VolumeExporter.new(workup['inject_volume']).to_clap
          end

          def solvents(chromatography_step)
            Clap::Exporter::Samples::SolventsWithRatioExporter.new(chromatography_step['solvents']).to_clap
          end

          def clap_step(stepname)
            Clap::ReactionProcessAction::ActionChromatography::ChromatographyStep::Step
              .const_get stepname.to_s
          rescue NameError
            Clap::ReactionProcessAction::ActionChromatography::ChromatographyStep::Step::STEP_UNSPECIFIED
          end

          def clap_prod(prodname)
            Clap::ReactionProcessAction::ActionChromatography::ChromatographyStep::Prod
              .const_get prodname.to_s
          rescue NameError
            Clap::ReactionProcessAction::ActionChromatography::ChromatographyStep::Prod::PROD_UNSPECIFIED
          end
        end
      end
    end
  end
end
