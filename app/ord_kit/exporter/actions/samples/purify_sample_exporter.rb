# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Samples
        class PurifySampleExporter < OrdKit::Exporter::Actions::Samples::Base
          private

          def components
            raise 'Unused'
            [
              OrdKit::Exporter::Compounds::PurifyCompoundExporter.new(action).to_ord,
            ]
          end
        end
      end
    end
  end
end
