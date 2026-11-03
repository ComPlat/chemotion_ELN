# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class SaveSample < Base
          def select_options
            { save_sample_types: save_sample_types,
              origin_types: origin_types }
          end

          private

          def origin_types
            [{ value: 'ALL', label: 'All' },
             { value: 'SPLIT', label: 'Split' },
             { value: 'PURIFICATION', label: 'Purification' }]
          end

          def save_sample_types
            [{ value: 'PURE', label: 'Pure' },
             { value: 'CRUDE', label: 'Crude' },
             { value: 'MIXTURE', label: 'Mixture' },
             { value: 'INTERMEDIATE', label: 'Intermediate' }]
          end
        end
      end
    end
  end
end
