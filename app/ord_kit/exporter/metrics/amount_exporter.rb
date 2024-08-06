# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class AmountExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          case @unit
          when 'l', 'ml', 'mcl', 'nl'
            Amount.new(
              volume_includes_solutes: volume_includes_solutes,
              volume: Amounts::VolumeExporter.new(@amount).to_ord,
            )
          when 'kg', 'g', 'mg', 'mcg'
            Amount.new(
              volume_includes_solutes: volume_includes_solutes,
              mass: Amounts::MassExporter.new(@amount).to_ord,
            )
          when 'mol', 'mmol', 'mcmol', 'nanomol'
            Amount.new(
              volume_includes_solutes: volume_includes_solutes,
              moles: Amounts::MolesExporter.new(@amount).to_ord,
            )
          when 'PERCENT'
            Amount.new(
              volume_includes_solutes: volume_includes_solutes,
              percentage: Amounts::PercentageExporter.new(@amount).to_ord,
            )
          end
        end

        private

        def volume_includes_solutes
          nil # hardcoded empty. Unknown in ELN.
        end
      end
    end
  end
end
