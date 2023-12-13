# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class AnalysisActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            analysis: OrdKit::Analysis.new(
              number: workup['analysis_number'],
              chmo_id: workup['chmo_id'].to_i,
              type: analysis_type,
            ),
          }
        end

        def analysis_type
          OrdKit::Analysis::AnalysisType.const_get(workup['analysis_type'])
        rescue NameError
          OrdKit::Analysis::AnalysisType::UNSPECIFIED
        end
      end
    end
  end
end
