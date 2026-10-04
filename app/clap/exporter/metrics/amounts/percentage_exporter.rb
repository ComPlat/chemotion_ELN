# frozen_string_literal: true

module Clap
  module Exporter
    module Metrics
      module Amounts
        class PercentageExporter < Clap::Exporter::Metrics::Base
          def to_clap
            Percentage.new(
              value: @value,
            )
          end
        end
      end
    end
  end
end
