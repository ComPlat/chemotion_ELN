# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class PressureControlExporter < Clap::Exporter::Conditions::Base
        # Works on ReactionProcessActivity ("CONDITION / PRESSURE")

        def to_clap
          Clap::PressureControl.new(
            pressure: pressure,
          )
        end

        private

        def pressure
          return if workup['value'].blank?

          Clap::Pressure.new(
            value: workup['value'].to_f,
            unit: Clap::Pressure::PressureUnit.const_get(workup['unit']),
          )
        end
      end
    end
  end
end
