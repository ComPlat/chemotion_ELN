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
                                                                 samples: samples,
                                                                 detectors: detectors }) }
          end

          def samples
            Array(workup['samples']).map do |sample|
              Clap::Sample.new(label: sample['label'])
            end
          end

          def detectors
            Array(workup['detector']).map do |detector_ontology_id|
              Clap::Exporter::Models::OntologyExporter.new(detector_ontology_id).to_clap
            end
          end

          def molecular_entities
            Array(workup['molecular_entities']).map do |sample|
              Clap::Sample.new(label: sample['label'])
            end
          end
        end
      end
    end
  end
end
