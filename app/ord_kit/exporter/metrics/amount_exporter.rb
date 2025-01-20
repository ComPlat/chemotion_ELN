# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class AmountExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          case @unit
          when 'l', 'ml', 'mcl', 'nl'
            Amount.new(volume: Amounts::VolumeExporter.new(@amount).to_ord)
          when 'kg', 'g', 'mg', 'mcg'
            Amount.new(mass: Amounts::MassExporter.new(@amount).to_ord)
          when 'mol', 'mmol', 'mcmol', 'nanomol'
            Amount.new(moles: Amounts::MolesExporter.new(@amount).to_ord)
          when 'PERCENT'
            Amount.new(percentage: Amounts::PercentageExporter.new(@amount).to_ord)
          end
        end
      end
    end
  end
end
