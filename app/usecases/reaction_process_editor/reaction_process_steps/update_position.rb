# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessSteps
      class UpdatePosition
        def self.execute!(reaction_process_step:, position:)
          ActiveRecord::Base.transaction do
            reaction_process_steps = reaction_process_step.siblings.to_a
            reaction_process_steps.delete(reaction_process_step)
            reaction_process_steps.insert(position, reaction_process_step)
            reaction_process_steps.compact.each_with_index { |sibling, idx| sibling.update(position: idx) }
            reaction_process_steps
          end
        end
      end
    end
  end
end
