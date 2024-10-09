# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class SaveSampleActionExporter < OrdKit::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            save_sample: ReactionProcessAction::ActionSaveSample.new(
              sample: OrdKit::Exporter::Compounds::SaveCompoundExporter.new(@action).to_ord,
              molecular_entities: molecular_entities,
              vessel: Vessels::ReactionProcessVesselExporter.new(workup['reaction_process_vessel']).to_ord,
              sample_origin_type: sample_origin_type,
              purification_origin: purification_origin,
            ),
          }
        end

        def molecular_entities
          Array(workup['samples']).map do |sample|
            OrdKit::Exporter::Samples::SampleExporter.new(sample).to_ord
          end
        end

        def sample_origin_type
          OrdKit::ReactionProcessAction::ActionSaveSample::OriginType.const_get(workup['sample_origin_type'].to_s)
        rescue NameError
          OrdKit::ReactionProcessAction::ActionSaveSample::OriginType::UNSPECIFIED
        end

        def purification_origin
          SaveSample::PurificationOriginExporter.new(@action).to_ord if workup['sample_origin_type'] == 'PURIFICATION'
        end
      end
    end
  end
end
