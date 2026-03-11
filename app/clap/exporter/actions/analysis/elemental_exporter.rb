# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      module Analysis
        class ElementalExporter < Actions::Base
          private

          def action_type_attributes
            { analysis_elemental:
            ReactionProcessAction::ActionAnalysisElemental.new({ molecular_entities: molecular_entities,
                                                                 sample: sample }) }
          end

          def sample
            Clap::Exporter::Compounds::SaveCompoundExporter.new(@action).to_clap if @action.sample
          end

          def molecular_entities
            Array(workup['molecular_entities']).map do |sample|
              Clap::Sample.new(
                label: sample['label'],
              )
            end
          end
        end
      end
    end
  end
end
