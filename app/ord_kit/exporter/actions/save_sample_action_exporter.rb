# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class SaveSampleActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            save_sample: ReactionProcessAction::ActionSaveSample.new(
              sample: OrdKit::Exporter::Compounds::SaveCompoundExporter.new(action).to_ord,
              molecular_entities: molecular_entities,
              vessel: Vessels::ReactionProcessVesselExporter.new(action.workup['reaction_process_vessel']).to_ord,
              origin_type: origin_type,
              purify_origin: purify_origin,
            ),
          }
        end

        def molecular_entities
          Array(action.workup['samples']).map do |sample|
            OrdKit::Exporter::Samples::SampleExporter.new(sample).to_ord
          end
        end

        def origin_type
          OrdKit::ReactionProcessAction::ActionSaveSample::OriginType.const_get(workup['origin_type'].to_s)
        rescue NameError
          OrdKit::ReactionProcessAction::ActionSaveSample::OriginType::UNSPECIFIED
        end

        def purify_origin
          SaveSample::PurifyOriginExporter.new(action).to_ord if action.workup['origin_type'] == 'PURIFCATION'
        end
      end
    end
  end
end
