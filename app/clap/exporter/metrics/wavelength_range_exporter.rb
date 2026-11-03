# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class WavelengthRangeExporter < Clap::Exporter::Metrics::Base
        def to_clap
          WavelengthRange.new(
            is_range: @amount['is_range'],
            peaks: @amount['peaks']&.map { |peak| WavelengthExporter.new(peak).to_clap },
          )
        end
      end
    end
  end
end
