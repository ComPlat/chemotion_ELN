# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class PhAdjustConditionsExporter < Clap::Exporter::Conditions::Base
        # Works on ReactionProcessActivity "CONDITION / PH"

        def to_clap
          Clap::PhAdjustConditions.new(
            measurement_type: measurement_type,
            value: workup['value'].to_f,
          )
        end

        private

        def measurement_type
          Clap::PhAdjustConditions::PhAdjustMeasurementType.const_get workup['additional_information'].to_s
        rescue NameError
          Clap::PhAdjustConditions::PhAdjustMeasurementType::UNSPECIFIED
        end
      end
    end
  end
end
