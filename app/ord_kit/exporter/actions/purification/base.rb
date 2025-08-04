# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      module Purification
        class Base
          def initialize(action)
            @action = action
          end

          attr_reader :action

          delegate :workup, to: :@action
        end
      end
    end
  end
end
