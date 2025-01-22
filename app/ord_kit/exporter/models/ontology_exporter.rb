# frozen_string_literal: true

module OrdKit
  module Exporter
    module Models
      class OntologyExporter
        def initialize(ontology_id)
          @ontology_id = ontology_id
        end

        def to_ord
          return unless @ontology_id

          { id: @ontology_id,
            label: ontology&.label || 'Error: Ontology undefined',
            name: ontology&.name || 'Error: Ontology undefined' }
        end

        private

        def ontology
          ReactionProcessEditor::Ontology.find_by(ontology_id: @ontology_id)
        end
      end
    end
  end
end
