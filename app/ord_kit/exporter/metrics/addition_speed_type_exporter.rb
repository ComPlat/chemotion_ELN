# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class AdditionSpeedTypeExporter
        def initialize(speed_type)
          @speed_type = speed_type.to_s
        end

        def to_ord
          ReactionInput::AdditionSpeed.new(
            type: addition_speed_type,
            details: '',
          )
        end

        private

        def addition_speed_type
          ReactionInput::AdditionSpeed::AdditionSpeedType.const_get(@speed_type)
        rescue NameError
          ReactionInput::AdditionSpeed::AdditionSpeedType::UNSPECIFIED
        end
      end
    end
  end
end
