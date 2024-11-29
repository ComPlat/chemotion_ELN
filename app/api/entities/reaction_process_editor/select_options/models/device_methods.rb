# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class DeviceMethods < Base
          def select_options_for(device_methods)
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
