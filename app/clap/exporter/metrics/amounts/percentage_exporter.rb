# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      module Amounts
        class PercentageExporter < Clap::Exporter::Metrics::Base
          def to_clap
            Percentage.new(
              value: @value,
              precision: nil, # TODO: precision states the number of valid digits. 3 or something.
            )
          end
        end
      end
    end
  end
end
