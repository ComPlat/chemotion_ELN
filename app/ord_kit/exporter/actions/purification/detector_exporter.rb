# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class DetectorExporter < Actions::Purification::Base
          def to_ord
            workup['detectors']&.map do |detector|
              OrdKit::Detector.new(
                type: detector_type(detector),
                conditions: detector_conditons(detector),
              )
            end
          end

          private

          def detector_type(detector)
            OrdKit::Analysis::AnalysisType.const_get(detector)
          rescue NameError
            OrdKit::Analysis::AnalysisType::UNSPECIFIED
          end

          def detector_conditons(detector)
            conditions_workup = detector_conditions_workup(detector)

            Conditions::ReactionConditionsExporter.new(conditions_workup).to_ord
          end

          def detector_conditions_workup(detector)
            workup.dig('detector_conditions', detector)
          end
        end
      end
    end
  end
end
