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
            label: ontology&.label || 'Error: Ontology non-existant',
            name: ontology&.name || 'Error: Ontology specified but non-existant' }
        end

        private

        def ontology
          ReactionProcessEditor::Ontology.find_by(ontology_id: @ontology_id)
        end
      end
    end
  end
end
