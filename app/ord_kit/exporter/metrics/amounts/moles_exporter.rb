# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      module Amounts
        class MolesExporter < OrdKit::Exporter::Metrics::Base
          ORD_UNIT_MAPPING = {
            UNSPECIFIED: 'UNSPECIFIED',
            mol: 'MOLE',
            mmol: 'MILLIMOLE',
            mcmol: 'MICROMOLE',
            nmol: 'NANOMOLE',
          }.stringify_keys.freeze

          def to_ord
            Moles.new(
              value: @value.to_f,
              precision: nil,
              units: units,
            )
          end

          private

          def units
            Moles::MolesUnit.const_get ORD_UNIT_MAPPING[@unit].to_s
          rescue NameError
            Moles::MolesUnit::UNSPECIFIED
          end
        end
      end
    end
  end
end
