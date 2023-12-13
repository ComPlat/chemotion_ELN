# frozen_string_literal: true

module OrdKit
  module Exporter
    module Samples
      class PurifySampleExporter < OrdKit::Exporter::Samples::Base
        private

        def components
          [
            OrdKit::Exporter::Compounds::PurifyCompoundExporter.new(action).to_ord,
          ]
        end
      end
    end
  end
end
