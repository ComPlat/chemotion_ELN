# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purify
        class ChromatographyExporter < Actions::Purify::Base
          def to_ord
            { chromatography: OrdKit::ReactionProcessAction::ActionChromatography.new(
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
            Array(workup['purify_steps']).map do |chromatography_step|
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

          def manual_fields
            OrdKit::ReactionProcessAction::ActionChromatography::Manual.new(
              material: Materials::MaterialExporter.new(workup['jar_material']).to_ord,
              diameter: Metrics::LengthExporter.new(workup['jar_diameter']).to_ord,
              height: Metrics::LengthExporter.new(workup['jar_height']).to_ord,
              filling_height: Metrics::LengthExporter.new(workup['jar_filling_height']).to_ord,
            )
          end

          def automated_fields
            OrdKit::ReactionProcessAction::ActionChromatography::Automated.new(
              equipment: equipment_device,
              column_type: workup['column_type'],
              detectors: detectors,
              wavelengths: wavelengths,
            )
          end

          def equipment_device
            OrdKit::Equipment.new(
              type: equipment_type(workup['device']),
              details: '', # Currently n/a in ELN.
            )
          end

          def equipment_type(name)
            OrdKit::Analysis::AnalysisType.const_get name.to_s
          rescue NameError
            OrdKit::Analysis::AnalysisType::UNSPECIFIED
          end

          def detectors
            Array(workup['detectors']).map do |detector|
              OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Detector.const_get detector
            rescue NameError
              OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::DETECTOR_UNSPECIFIED
            end
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
            OrdKit::Exporter::Samples::SolventsWithRatioExporter.new(chromatography_step['solvents']).to_ord
          end

          def ord_step(stepname)
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Step.const_get stepname.to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Step::STEP_UNSPECIFIED
          end

          def ord_prod(prodname)
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Prod.const_get prodname.to_s
          rescue NameError
            OrdKit::ReactionProcessAction::ActionChromatography::ChromatographyStep::Prod::PROD_UNSPECIFIED
          end
        end
      end
    end
  end
end
