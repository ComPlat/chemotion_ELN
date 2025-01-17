# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Ontologies < Base
          def all
            ::ReactionProcessEditor::Ontology.includes([:device_methods]).order(:ontology_id).map do |ontology|
              ontology.attributes
                      .slice(*%w[label ontology_id solvents link roles active])
                      .merge({
                               value: ontology.ontology_id,
                               methods: SelectOptions::Models::DeviceMethods.new.select_options_for(
                                 ontology.device_methods,
                               ),
                               detectors: SelectOptions::Models::Detectors.new.select_options_for(
                                 ontology.detectors,
                               ),
                               is_new: ontology.detectors,
                             })
            end
          end
        end
      end
    end
  end
end
