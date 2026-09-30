# frozen_string_literal: true

module Usecases
  module Reactions
    class UpdateSteps
      def initialize(reaction, steps_params)
        @reaction = reaction
        @steps_params = steps_params || []
      end

      def execute!
        kept = @steps_params.each_with_index.map { |attributes, index| persist(attributes, index + 1) }

        discard(@reaction.reaction_steps.where.not(id: kept.map(&:id)))
        @reaction.reaction_steps.reload
      end

      private

      def persist(attributes, position)
        values = attributes.to_h.symbolize_keys.except(:id).merge(position: position)
        step = @reaction.reaction_steps.find_by(id: attributes[:id])
        step ? step.tap { |existing| existing.update!(values) } : @reaction.reaction_steps.create!(values)
      end

      def discard(steps)
        ReactionsSample.where(reaction_step_id: steps.map(&:id))
                       .update_all(reaction_step_id: nil, carry_on: false) # rubocop:disable Rails/SkipsModelValidations
        steps.destroy_all
      end
    end
  end
end
