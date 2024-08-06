# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Remove < Base
        include Singleton

        def origin_types
          [
            { value: 'FROM_REACTION', label: 'From Reaction' },
            { value: 'FROM_REACTION_STEP', label: 'From Reaction Step' },
            { value: 'DIVERSE_SOLVENTS', label: 'Diverse Solvents' },
            { value: 'FROM_SAMPLE', label: 'From Sample' },
            { value: 'STEPWISE', label: 'Stepwise' },
            { value: 'FROM_METHOD', label: 'From Method' },
          ]
        end
      end
    end
  end
end
