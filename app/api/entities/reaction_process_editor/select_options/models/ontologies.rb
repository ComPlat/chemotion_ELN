# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Ontologies < Base
          def all
            ::ReactionProcessEditor::Ontology.includes([:device_methods]).order(:updated_at).map do |ontology|
              ontology.attributes
                      .slice(*%w[label ontology_id link roles active])
                      .merge({
                               value: ontology.ontology_id,
                               methods: SelectOptions::Models::DeviceMethods.new.select_options_for(
                                 ontology.device_methods,
                               ),
                               detectors: SelectOptions::Models::Detectors.new.select_options_for(
                                 ontology.detectors,
                               ),
                               stationary_phase: stationary_phase_options(ontology),
                               mobile_phase: mobile_phase_options(ontology),
                             })
            end
          end

          private

          def mobile_phase_options(ontology)
            solvents = ::ReactionProcessEditor::Ontology.where(ontology_id: ontology.solvents)

            solvents&.map do |solvent|
              solvent_ontology_id = solvent.ontology_id

              ontology_option_for(
                role: 'mobile_phase',
                active: ontology&.active && solvent&.active,
                value: solvent_ontology_id,
                label: solvent&.label || solvent_ontology_id,
              )
            end
          end

          def stationary_phase_options(ontology)
            return [] unless ontology.stationary_phase

            ontology.stationary_phase.map do |stationary_phase|
              ontology_option_for(role: 'stationary_phase', active: ontology.active, value: stationary_phase)
            end
          end
        end
      end
    end
  end
end
