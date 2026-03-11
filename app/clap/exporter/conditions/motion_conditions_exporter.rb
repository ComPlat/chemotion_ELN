# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class MotionConditionsExporter < Clap::Exporter::Conditions::Base
        def to_clap
          StirringConditions.new(
            type: stirring_method_type,
            details: details,
            speed: speed,
          )
        end

        private

        def stirring_method_type
          Clap::StirringConditions::StirringMethodType.const_get workup['motion_type'].to_s
        rescue NameError
          Clap::StirringConditions::StirringMethodType::UNSPECIFIED
        end

        def details
          nil # n/a. Unkown in ELN.
        end

        def speed
          Clap::Motion.new(
            value: workup.dig('speed', 'value').to_f,
            unit: Clap::Motion::MotionUnit::RPM,
          )
        end
      end
    end
  end
end
