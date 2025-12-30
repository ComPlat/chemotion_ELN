# frozen_string_literal: true

module OrdKit
  module Exporter
    module Samples
      class OntologySolventsWithRatioExporter
        def initialize(solvents_workup)
          @solvents_workup = solvents_workup
        end

        def to_ord
          Array(@solvents_workup).map do |solvent_workup|
            OrdKit::OntologyMaterialWithRatio.new(
              solvent: solvent_ord(solvent_workup),
              ratio: solvent_workup['ratio'].to_s,
            )
          end
        end

        private

        def solvent_ord(solvent_workup)
          ontology_id = solvent_workup['ontology_id'] ||
                        ReactionProcessEditor::Ontology.find_by(label: solvent_workup['label'])&.id

          if ontology_id
            ontology_ord(ontology_id)
          else
            # workaround for Solvents from predefined steps.
            { id: 'Solvent has no Ontology ID',
              label: solvent_workup['label'] || 'Error: Empty Solvent',
              name: solvent_workup['value'] }
          end
        end

        def ontology_ord(ontology_id)
          OrdKit::Exporter::Models::OntologyExporter.new(ontology_id).to_ord
        end
      end
    end
  end
end
