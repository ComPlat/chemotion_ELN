# frozen_string_literal: true

module OrdKit
  module Exporter
    module Samples
      class RemoveSampleExporter < OrdKit::Exporter::Samples::Base
        private

        def components
          [
            OrdKit::Exporter::Compounds::AddCompoundExporter.new(action).to_ord,
          ]
        end
      end
    end
  end
end
