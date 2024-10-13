# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class WavelengthRangeExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          WavelengthRange.new(
            is_range: @amount['is_range'],
            peaks: @amount['peaks']&.map { |peak| WavelengthExporter.new(peak).to_ord },
          )
        end
      end
    end
  end
end
