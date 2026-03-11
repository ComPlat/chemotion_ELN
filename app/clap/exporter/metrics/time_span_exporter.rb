# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      class TimeSpanExporter
        def initialize(duration)
          @duration = duration
        end

        def to_clap
          return unless @duration

          # We deliver all TimeSpans in seconds per convention which is the finest granularity we need.
          # In the workup we store milliseconds following the javascript standard. cbuggle, 1.8.2024
          Clap::TimeSpan.new(
            value: @duration.to_i / 1000,
            unit: Clap::TimeSpan::TimeUnit::SECOND,
          )
        end
      end
    end
  end
end
