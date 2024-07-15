# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Remove < Base
        include Singleton

        def origin_types
          [
            { value: 'FROM_REACTION', label: 'From Reaction' },
            { value: 'FROM_STEP', label: 'From Step' },
            { value: 'FROM_SAMPLE', label: 'From Sample' },
            { value: 'DIVERSE_SOLVENTS', label: 'Diverse Solvents' },
            { value: 'STEPWISE', label: 'Stepwise' },
            { value: 'FROM_METHOD', label: 'From Method' },
          ]
        end
      end
    end
  end
end
