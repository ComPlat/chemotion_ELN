# frozen_string_literal: true

module OrdKit
  module Exporter
    module Conditions
      class MotionConditionsExporter < OrdKit::Exporter::Conditions::Base
        def to_ord
          StirringConditions.new(
            type: stirring_method_type,
            details: details,
            rate: stirring_rate,
            automation_mode: automation_mode,
          )
        end

        private

        def stirring_method_type
          OrdKit::StirringConditions::StirringMethodType.const_get workup['motion_type'].to_s
        rescue NameError
          OrdKit::StirringConditions::StirringMethodType::UNSPECIFIED
        end

        def details
          nil # n/a. Unkown in ELN.
        end

        def stirring_rate
          OrdKit::StirringConditions::StirringRate.new(
            type: OrdKit::StirringConditions::StirringRate::StirringRateType::UNSPECIFIED,
            details: nil, # n/a. Unkown in ELN.
            rpm: workup.dig('speed', 'value').to_f,
          )
        end

        def automation_mode
          Automation::AutomationMode.const_get workup['motion_mode'].to_s
        rescue NameError
          Automation::AutomationMode::UNSPECIFIED
        end
      end
    end
  end
end
