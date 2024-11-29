# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Ontologies < Base
          def all
            ::ReactionProcessEditor::Ontology.includes([:device_methods]).all.map do |ontology|
              ontology.attributes
                      .slice(*%w[label chmo_id solvents link roles active detectors])
                      .merge({
                               value: ontology.chmo_id,
                               methods: SelectOptions::Models::DeviceMethods.new.select_options_for(
                                 ontology.device_methods,
                               ),
                               detectors: SelectOptions::Models::Detectors.new.select_options_for(ontology.detectors),
                             })
            end
          end

          private

          def device_methods_options(device_methods)
            device_methods.map do |method|
              method.attributes
                    .slice(*%w[label device_name detectors stationary_phases description steps default_inject_volume
                               active])
                    .merge({ value: method.label,
                             mobile_phases: options_for(method.mobile_phases) })
            end
          end
        end
      end
    end
  end
end
