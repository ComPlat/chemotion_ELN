# frozen_string_literal: true

module OrdKit
  module Exporter
    module Conditions
      class PhAdjustConditionsExporter < OrdKit::Exporter::Conditions::Base
        # Works on ReactionProcessActivity "CONDITION / PH"

        def to_ord
          OrdKit::PhAdjustConditions.new(
            measurement_type: measurement_type,
            value: workup['value'].to_f,
          )
        end

        private

        def measurement_type
          OrdKit::PhAdjustConditions::PhAdjustMeasurementType.const_get workup['additional_information'].to_s
        rescue NameError
          OrdKit::PhAdjustConditions::PhAdjustMeasurementType::UNSPECIFIED
        end
      end
    end
  end
end
