# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class ChromatographyExporter < Actions::Base
          private

          def action_type_attributes
            { chromatography: OrdKit::ReactionProcessAction::ActionChromatography.new(
              {
                stationary_phase: workup['stationary_phase'],
                steps: steps,
                fractions: fractions,
                molecular_entities: molecular_entities,
                sample: sample,
              }.merge(automation_specific_fields),
            ) }
          end

          def sample
            OrdKit::Exporter::Compounds::SaveCompoundExporter.new(@action).to_ord if @action.sample
          end

          def molecular_entities
            Array(workup['molecular_entities']).map do |sample|
              OrdKit::Exporter::Samples::SampleExporter.new(sample).to_ord
            end
          end

          def fractions
            action.fractions.map do |fraction|
              OrdKit::Exporter::Samples::FractionExporter.new(fraction).to_ord
            end
          end

          def automation_mode_ontology
            ReactionProcessEditor::Ontology.find_by(ontology_id: action.reaction_process_step.automation_mode)
          end

          def automation_mode_manual?
            # %w[manual].include?(automation_mode_ontology&.label)
            # TODO: Guess we need some "OntologyConstants" or something. cbuggle, 30.12.2025.
            # automation_mode_ontology&.ontology_id == "NCIT:C63513"
            ['NCIT:C63513'].include?(automation_mode_ontology&.ontology_id)
          end

          def automation_mode_automated?
            # %w[automated semi-automated].include?(automation_mode_ontology&.label)
            ['NCIT:C172484', 'NCIT:C70669'].include?(automation_mode_ontology&.ontology_id)
          end

          def automation_specific_fields
            return automation_manual_fields if automation_mode_manual?
            return automation_automated_fields if automation_mode_automated?

            {}
          end

          def automation_manual_fields
            {
              material: ontology_ord(workup['jar_material']),
              diameter: Metrics::LengthExporter.new(workup['jar_diameter']).to_ord,
              height: Metrics::LengthExporter.new(workup['jar_height']).to_ord,
              filling_height: Metrics::LengthExporter.new(workup['jar_filling_height']).to_ord,
            }
          end

          def automation_automated_fields
            {
              detectors: detectors,
              mobile_phase: mobile_phase_ontologies(workup['mobile_phase']),
              stationary_phase_temperature: stationary_phase_temperature,
              volume: volume,
            }
          end

          def mobile_phase_ontologies(ontology_ids)
            ontology_ids&.map { |ontology_id| ontology_ord(ontology_id) }
          end

          def detectors
            workup['detectors']&.map do |detector_ontology_id|
              ontology_ord(detector_ontology_id)
            end
          end

          def steps
            Array(workup['purification_steps']).map do |chromatography_step|
              OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep.new(
                solvents: solvents(chromatography_step),
                amount: Metrics::AmountExporter.new(chromatography_step['amount']).to_ord,
                step: ord_step(chromatography_step['step_mode']),
                prod: ord_prod(chromatography_step['prod_mode']),
                flow_rate: Metrics::FlowRateExporter.new(chromatography_step['flow_rate']).to_ord,
                duration: Metrics::TimeSpanExporter.new(chromatography_step['duration']).to_ord,
              )
            end
          end

          def stationary_phase_temperature
            return unless workup['stationary_phase_temperature']

            OrdKit::Exporter::Conditions::TemperatureConditionsExporter.new(
              workup['stationary_phase_temperature'],
            ).to_ord
          end

          def volume
            OrdKit::Exporter::Metrics::Amounts::VolumeExporter.new(workup['VOLUME']).to_ord
          end

          def wavelengths
            OrdKit::ReactionProcessAction::ActionChromatography::Automated::WavelengthList.new(
              peaks: Array(workup.dig('wavelengths', 'peaks')).map do |wavelength|
                       Metrics::WavelengthExporter.new(wavelength).to_ord
                     end,
              is_range: workup.dig('wavelengths', 'is_range'),
            )
          end

          def solvents(chromatography_step)
            OrdKit::Exporter::Samples::OntologySolventsWithRatioExporter.new(chromatography_step['solvents']).to_ord
          end

          def ord_step(stepname)
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Step
              .const_get stepname.to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Step::STEP_UNSPECIFIED
          end

          def ord_prod(prodname)
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Prod
              .const_get prodname.to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Prod::PROD_UNSPECIFIED
          end
        end
      end
    end
  end
end
