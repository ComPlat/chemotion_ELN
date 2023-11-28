# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class PhAdjustControlExporter < Clap::Exporter::Conditions::Base
        # Works on ReactionProcessActivity "CONDITION / PH"

        def to_clap
          Clap::PhAdjustControl.new(
            measurement_type: measurement_type,
            ph: workup['value'].to_f,
          )
        end

        private

        def measurement_type
          Clap::PhAdjustControl::PhAdjustMeasurementType.const_get workup['additional_information'].to_s
        rescue NameError
          Clap::PhAdjustControl::PhAdjustMeasurementType::UNSPECIFIED
        end
      end
    end
  end
end
