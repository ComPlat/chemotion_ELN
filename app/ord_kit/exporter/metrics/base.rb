# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class Base
        def initialize(amount)
          @amount = amount
          @value = amount&.dig('value')
          @unit = amount&.dig('unit').to_s
        end

        private

        attr_reader :amount, :value, :unit
      end
    end
  end
end
