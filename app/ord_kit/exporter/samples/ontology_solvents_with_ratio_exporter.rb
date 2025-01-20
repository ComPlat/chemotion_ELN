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
            # TODO: key 'chmo_id' is obsolete, but still in data. Write transformation script.
            ontology_id = solvent_workup['ontology_id'] || solvent_workup['chmo_id']
            OrdKit::OntologySolventWithRatio.new(
              solvent: ontology_ord(ontology_id),
              ratio: solvent_workup['ratio'].to_s,
            )
          end
        end

        private

        def ontology_ord(ontology_id)
          OrdKit::Exporter::Models::OntologyExporter.new(ontology_id).to_ord
        end
      end
    end
  end
end
