# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module Samples
      class UpdateIntermediateType
        def self.execute!(sample:, intermediate_type:)
          return unless intermediate_type
          sample.reactions_intermediate_samples.each do |reactions_sample|
            reactions_sample.update(intermediate_type: intermediate_type)
          end
        end
      end
    end
  end
end
