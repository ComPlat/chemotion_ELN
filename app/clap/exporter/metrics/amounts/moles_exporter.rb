# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      module Amounts
        class MolesExporter < Clap::Exporter::Metrics::Base
          CLAP_UNIT_MAPPING = {
            UNSPECIFIED: 'UNSPECIFIED',
            mol: 'MOLE',
            mmol: 'MILLIMOLE',
            mcmol: 'MICROMOLE',
            nmol: 'NANOMOLE',
          }.stringify_keys.freeze

          def to_clap
            Moles.new(
              value: @value.to_f,
              precision: nil,
              unit: clap_unit,
            )
          end

          private

          def clap_unit
            Moles::MolesUnit.const_get CLAP_UNIT_MAPPING[@unit].to_s
          rescue NameError
            Moles::MolesUnit::UNSPECIFIED
          end
        end
      end
    end
  end
end
