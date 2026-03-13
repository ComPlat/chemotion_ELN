# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class MotionControlExporter < Clap::Exporter::Conditions::Base
        def to_clap
          MotionControl.new(
            type: motion_method_type,
            speed: speed,
            motion_mode: motion_mode,
          )
        end

        private

        def motion_method_type
          Clap::MotionControl::MotionControlType.const_get workup['motion_type'].to_s
        rescue NameError
          Clap::MotionControl::MotionControlType::UNSPECIFIED
        end

        def speed
          Clap::Motion.new(
            value: workup.dig('speed', 'value').to_f,
            unit: Clap::Motion::MotionUnit::RPM,
          )
        end

        def motion_mode
          Clap::Exporter::Models::OntologyExporter.new(workup['motion_mode']).to_clap
        end
      end
    end
  end
end
