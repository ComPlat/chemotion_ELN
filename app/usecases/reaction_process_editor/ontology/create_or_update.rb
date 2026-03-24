# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module Ontology
      class CreateOrUpdate
        def self.execute!(ontology_params:)
          ontology = ::ReactionProcessEditor::Ontology.find_or_initialize_by(ontology_id: ontology_params[:ontology_id])

          ontology.update(ontology_params)
        end
      end
    end
  end
end
