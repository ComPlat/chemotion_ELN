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
            parent_activity_id: fraction.parent_activity_id,
            consuming_activity_id: fraction.consuming_activity_id,
          )
        end

        private

        attr_reader :fraction
      end
    end
  end
end
