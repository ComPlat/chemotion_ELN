# frozen_string_literal: true

module Clap
  module Exporter
    module Samples
      class SolventsWithRatioExporter
        def initialize(solvents_workup)
          @solvents_workup = solvents_workup
        end

        def to_clap
          Array(@solvents_workup).map do |solvent_workup|
            Clap::SolventWithRatio.new(
              solvent: solvent(solvent_workup),
              ratio: solvent_workup['ratio'].to_s,
            )
          end
        end

        private

        def solvent(workup)
          Clap::Sample.new(
            label: workup['label'],
            ontology: ontology_ord(workup['id']),
          )
        end

        def ontology_ord(ontology_id)
          return unless ReactionProcessEditor::Ontology.find_by(ontology_id: ontology_id)

          Clap::Exporter::Models::OntologyExporter.new(ontology_id).to_clap
        end
      end
    end
  end
end

#  Array(workup['molecular_entities']).map do |sample|
#               Clap::Sample.new(
#                 label: sample['label'],
#               )
#             end
