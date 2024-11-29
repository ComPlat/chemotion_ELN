# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Analysis
          class Spectroscopy < Base
            def select_options
              { spectroscopy_types: spectroscopy_types_options,
                devices: devices }
            end

            private

            def spectroscopy_types_options
              # SelectOptions::Models::DeviceTypes.new.select_options(process_type: 'Analysis',
              #                                                       category: 'Spectroscopy')
            end

            def devices
              # spectroscopy_types_options.pluck(:subtypes).flatten.pluck(:devices).flatten.compact
            end
          end
        end
      end
    end
  end
end
