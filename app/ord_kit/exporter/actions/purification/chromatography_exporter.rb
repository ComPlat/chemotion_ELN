# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class ChromatographyExporter < Actions::Purification::Base
          def to_ord
            { chromatography: OrdKit::ReactionProcessAction::ActionPurificationChromatography.new(
              {
                type: ontology_ord(workup['type']),
                subtype: ontology_ord(workup['subtype']),
                stationary_phase: workup['stationary_phase'],
                steps: steps,
                automation_mode: ontology_ord(workup['automation_mode']),
              }.merge(automation_specific_fields),
            ) }
          end

          private

          def automation_mode_ontology
            ReactionProcessEditor::Ontology.find_by(ontology_id: workup['automation_mode'])
          end

          def automation_mode_manual?
            %w[manual].include?(automation_mode_ontology&.label)
          end

          def automation_mode_automated?
            %w[automated semi-automated].include?(automation_mode_ontology&.label)
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
              device: ontology_ord(workup['device']),
              detectors: detectors,
              method: workup['method'],
              mobile_phase: workup['mobile_phase'],
              stationary_phase_temperature: stationary_phase_temperature,
              volume: volume,
            }
          end

          def ontology_ord(ontology_id)
            OrdKit::Exporter::Models::OntologyExporter.new(ontology_id).to_ord
          end

          def detectors
            workup['detectors']&.map do |detector_ontology_id|
              ontology_ord(detector_ontology_id)
            end
          end

          def steps
            Array(workup['purification_steps']).map do |chromatography_step|
              OrdKit::ReactionProcessAction::ActionPurificationChromatography::ChromatographyStep.new(
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
            OrdKit::ReactionProcessAction::ActionPurificationChromatography::Automated::WavelengthList.new(
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
            OrdKit::ReactionProcessAction::ActionPurificationChromatography::ChromatographyStep::Step
              .const_get stepname.to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionPurificationChromatography::ChromatographyStep::Step::STEP_UNSPECIFIED
          end

          def ord_prod(prodname)
            OrdKit::ReactionProcessAction::ActionPurificationChromatography::ChromatographyStep::Prod
              .const_get prodname.to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionPurificationChromatography::ChromatographyStep::Prod::PROD_UNSPECIFIED
          end
        end
      end
    end
  end
end
