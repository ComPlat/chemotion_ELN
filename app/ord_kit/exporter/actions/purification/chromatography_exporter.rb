# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class ChromatographyExporter < Actions::Purification::Base
          def to_ord
            { chromatography: OrdKit::ReactionProcessAction::ActionPurificationChromatography.new(
              { steps: steps }.merge(automation[workup['automation']] || {}),
            ) }
          end

          private

          def automation
            { AUTOMATED: { automated: automated_fields }.stringify_keys,
              MANUAL: { manual: manual_fields },
              SEMI_AUTOMATED: { semi_automated: automated_fields } }.stringify_keys
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

          def manual_fields
            OrdKit::ReactionProcessAction::ActionPurificationChromatography::Manual.new(
              material: Materials::MaterialExporter.new(workup['jar_material']).to_ord,
              diameter: Metrics::LengthExporter.new(workup['jar_diameter']).to_ord,
              height: Metrics::LengthExporter.new(workup['jar_height']).to_ord,
              filling_height: Metrics::LengthExporter.new(workup['jar_filling_height']).to_ord,
            )
          end

          def automated_fields
            OrdKit::ReactionProcessAction::ActionPurificationChromatography::Automated.new(
              chromatography_type: workup['chromatography_type'],
              chromatography_subtype: workup['chromatography_subtype'],
              device: workup['device'],
              detectors: detectors,
              method: workup['method'],
              mobile_phases: mobile_phases,
              stationary_phase: workup['stationary_phase'],
              stationary_phase_temperature: stationary_phase_temperature,
              volume: volume,
            )
          end

          def detectors
            DetectorExporter.new(workup).to_ord
          end

          def mobile_phases
            workup['mobile_phases']
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
            OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(chromatography_step['solvents']).to_ord
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
