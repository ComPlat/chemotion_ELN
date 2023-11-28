# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessSteps
      class Destroy
        def self.execute!(reaction_process_step:)
          steps = reaction_process_step.reaction_process.reaction_process_steps.order(:position).to_a
          steps.delete(reaction_process_step)
          steps.each_with_index { |process_step, idx| process_step.update(position: idx) }

          reaction_process_step.destroy

          steps
        end
      end
    end
  end
end
