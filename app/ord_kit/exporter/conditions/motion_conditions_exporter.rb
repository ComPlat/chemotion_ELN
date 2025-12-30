# frozen_string_literal: true

module OrdKit
  module Exporter
    module Conditions
      class MotionConditionsExporter < OrdKit::Exporter::Conditions::Base
        def to_ord
          StirringConditions.new(
            type: stirring_method_type,
            details: details,
            speed: speed,
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

        def speed
          OrdKit::Motion.new(
            value: workup.dig('speed', 'value').to_f,
            unit: OrdKit::Motion::MotionUnit::RPM,
          )
        end
      end
    end
  end
end
