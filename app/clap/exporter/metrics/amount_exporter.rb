# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class AmountExporter < Clap::Exporter::Metrics::Base
        def to_clap
          case @unit
          when 'l', 'ml', 'mcl', 'nl'
            Amount.new(volume: Amounts::VolumeExporter.new(@amount).to_clap)
          when 'kg', 'g', 'mg', 'mcg'
            Amount.new(mass: Amounts::MassExporter.new(@amount).to_clap)
          when 'mol', 'mmol', 'mcmol', 'nanomol'
            Amount.new(moles: Amounts::MolesExporter.new(@amount).to_clap)
          when 'PERCENT'
            Amount.new(percentage: Amounts::PercentageExporter.new(@amount).to_clap)
          end
        end
      end
    end
  end
end
