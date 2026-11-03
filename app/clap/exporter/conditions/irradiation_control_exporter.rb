# frozen_string_literal: true

module Clap
  module Exporter
    module Conditions
      class IrradiationControlExporter < Clap::Exporter::Conditions::Base
        # Works on ReactionProcessActivity "CONDITION / IRRADIATION"
        def to_clap
          IrradiationControl.new(
            type: irradiation_type,
            peak_wavelength: peak_wavelength,
            power: power,
            power_is_ramp: power_is_ramp,
            power_end: power_end,
          )
        end

        private

        def irradiation_type
          IrradiationControl::IrradiationType.const_get workup['additional_information'].to_s
        rescue NameError
          IrradiationControl::IrradiationType::UNSPECIFIED
        end

        def peak_wavelength
          Exporter::Metrics::WavelengthExporter.new(workup).to_clap
        end

        def power
          return if workup['power'].blank?

          Exporter::Metrics::PowerExporter.new(workup['power']).to_clap
        end

        def power_end
          return unless power_is_ramp && workup['power_end'].present?

          Exporter::Metrics::PowerExporter.new(workup['power_end']).to_clap
        end

        def power_is_ramp
          workup['power_is_ramp']
        end
      end
    end
  end
end
