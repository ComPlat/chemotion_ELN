# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class DeviceMethods < Base
          REGEX_NAMES_AND_BRACKET_VALUES = /(.*?) \((.*?)\),?/.freeze

          def select_options_for(device_methods)
            device_methods.map do |method|
              method.attributes
                    .slice(*%w[label device_name detectors description steps default_inject_volume
                               active])
                    .merge({ value: method.label,
                             stationary_phase: stationary_phase_options(method),
                             mobile_phase: mobile_phase_options_for(method) })
                    .merge(pseudo_ontology_option_for(base_ontology: method.ontology,
                                                      role: 'method',
                                                      value: method.label))
            end
          end

          private

          def stationary_phase_options(method)
            method.stationary_phase&.map do |stationary_phase|
              pseudo_ontology_option_for(base_ontology: method.ontology,
                                         role: 'stationary_phase',
                                         value: stationary_phase)
            end
          end

          def mobile_phase_options_for(method)
            method.mobile_phase.map do |mobile_phase|
              mobile_phase_option(mobile_phase).merge({ active: method.active })
            end
          end

          def mobile_phase_option(ontology_string)
            res = ontology_string.match(REGEX_NAMES_AND_BRACKET_VALUES)

            if res[2].present?
              ontology_id = res[1]
              solute = res[2].split('% ')
              label = "#{ontology_label(ontology_id)} (#{solute[0]}% #{ontology_label(solute[1])})"
            else
              ontology_id = res[1].tr(' ()', '')
              label = ontology_label(ontology_id)
            end

            # assemble pseudo_ontology
            { label: label,
              value: ontology_id,
              ontology_id: ontology_id,
              roles: { mobile_phase: [{}] } }
          end

          def ontology_label(ontology_id)
            ::ReactionProcessEditor::Ontology.find_by(ontology_id: ontology_id)&.label
          end
        end
      end
    end
  end
end
