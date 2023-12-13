# frozen_string_literal: true

module OrdKit
  module Exporter
    module Conditions
      class Base
        def initialize(workup)
          @workup = workup
        end

        private

        attr_reader :workup
      end
    end
  end
end
