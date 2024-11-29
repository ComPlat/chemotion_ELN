# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Analysis
          class Spectrometry < Base
            def select_options
              { spectrometry_types: spectrometry_types_options,
                devices: devices }
            end

            private

            def spectrometry_types_options
              # SelectOptions::Models::DeviceTypes.new.select_options(process_type: 'Analysis',
              #                                                       category: 'Spectrometry')
            end

            def devices
              #  spectrometry_types_options.pluck(:subtypes).flatten.pluck(:devices).flatten.compact
            end
          end
        end
      end
    end
  end
end
