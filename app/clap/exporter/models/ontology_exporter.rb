# frozen_string_literal: true

module Clap
  module Exporter
    module Models
      class OntologyExporter
        def initialize(ontology_id)
          @ontology_id = ontology_id
        end

        def to_clap
          return unless @ontology_id

          { id: @ontology_id,
            label: ontology_label,
            name: ontology_name }
        end

        private

        def ontology_name
          if ontology
            ontology.name
          else
            'Error: Ontology specified but non-existant'
          end
        end

        def ontology_label
          if ontology
            ontology.label
          else
            'Error: Ontology specified but non-existant'
          end
        end

        def ontology
          ReactionProcessEditor::Ontology.find_by(ontology_id: @ontology_id)
        end
      end
    end
  end
end
