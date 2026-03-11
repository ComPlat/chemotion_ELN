# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class SaveSampleActionExporter < Clap::Exporter::Actions::Base
        private

        def action_type_attributes
          {
            save_sample: ReactionProcessAction::ActionSaveSample.new(
              sample: sample,
              molecular_entities: molecular_entities,
              sample_origin_type: sample_origin_type,
              purification_origin: purification_origin,
            ),
          }
        end

        def sample
          Clap::Exporter::Samples::SampleInActionExporter.new(action).to_clap
        end

        def molecular_entities
          Array(workup['molecular_entities']).map do |sample|
            Clap::Sample.new(
              label: sample['label'],
            )
          end
        end

        def sample_origin_type
          Clap::ReactionProcessAction::ActionSaveSample::OriginType.const_get(workup['sample_origin_type'].to_s)
        rescue NameError
          Clap::ReactionProcessAction::ActionSaveSample::OriginType::UNSPECIFIED
        end

        def purification_origin
          SaveSample::PurificationOriginExporter.new(@action).to_clap if workup['sample_origin_type'] == 'PURIFICATION'
        end
      end
    end
  end
end
