# frozen_string_literal: true

module OrdKit
  module Exporter
    module Metrics
      class AdditionSpeedTypeExporter < OrdKit::Exporter::Metrics::Base
        def to_ord
          ReactionInput::AdditionSpeed.new(
            type: ReactionInput::AdditionSpeed::AdditionSpeedType.const_get(amount),
            details: '',
          )
        end
      end
    end
  end
end
