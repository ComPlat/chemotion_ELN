# frozen_string_literal: true

module OrdKit
  module Exporter
    class Base
      def initialize(model)
        @model = model
      end

      private

      attr_reader :model
    end
  end
end
