# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class CentrifugationExporter < Actions::Base
          private

          def action_type_attributes
            {
              centrifugation:
              ReactionProcessAction::ActionCentrifugation.new({
                                                                pressure: Metrics::PressureExporter.new(workup['PRESSURE']).to_ord,
                                                                temperature: Metrics::TemperatureExporter.new(workup['TEMPERATURE']).to_ord,
                                                                motion: Metrics::MotionExporter.new(workup['MOTION']).to_ord,
                                                              }),
            }
          end
        end
      end
    end
  end
end
