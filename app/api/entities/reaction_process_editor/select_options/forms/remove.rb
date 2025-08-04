# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Remove < Base
          def select_options
            {
              automation_modes: SelectOptions::Models::Custom.new.automation_modes,
              sample_types: sample_types,
              origin_types: origin_types,
              equipment: equipment,
            }
          end

          private

          def equipment
            titlecase_options_for(%w[PUMP TUBE COIL])
          end

          def sample_types
            [{ value: 'MEDIUM', label: 'Medium' },
             { value: 'ADDITIVE', label: 'Solvent (Evaporate)' },
             { value: 'DIVERSE_SOLVENT', label: 'Diverse Solvent' }]
          end

          def origin_types
            [
              { value: 'FROM_REACTION', label: 'From Reaction' },
              { value: 'FROM_REACTION_STEP', label: 'From Reaction Step' },
              { value: 'DIVERSE_SOLVENTS', label: 'Diverse Solvents' },
              { value: 'FROM_SAMPLE', label: 'From Sample' },
              { value: 'STEPWISE', label: 'Stepwise' },
              { value: 'FROM_METHOD', label: 'From Method' },
              { value: 'SOLVENT_FROM_FRACTION', label: 'Solvent From Fraction' },
            ]
          end
        end
      end
    end
  end
end
