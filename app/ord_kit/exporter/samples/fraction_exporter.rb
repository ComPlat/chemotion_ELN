# frozen_string_literal: true

module OrdKit
  module Exporter
    module Samples
      class FractionExporter
        def initialize(fraction)
          @fraction = fraction
        end

        def to_ord
          return unless fraction

          OrdKit::PoolingFraction.new(
            position: fraction.position,
            vials: fraction.vials,
            parent_action_id: fraction.parent_action_id,
            consuming_action_id: fraction.consuming_action_id,
          )
        end

        private

        attr_reader :fraction
      end
    end
  end
end
