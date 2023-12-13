# frozen_string_literal: true

module OrdKit
  module Exporter
    module Reactions
      class ReactionProcessExporter < OrdKit::Exporter::Base
        def to_ord
          start_times = process_steps.inject([0]) { |starts, rps| starts << (starts.last + rps.duration.to_i) }

          process_steps.map.with_index do |rps, idx|
            ReactionProcessStepExporter.new(rps).to_ord(starts_at: start_times[idx])
          end
        end

        private

        def process_steps
          model.reaction_process_steps.order(:position)
        end
      end
    end
  end
end
