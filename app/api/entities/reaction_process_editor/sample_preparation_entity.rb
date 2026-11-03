# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class SamplePreparationEntity < Grape::Entity
      expose(:id, :sample_id, :preparations, :equipment, :details)

      expose :sample, using: 'Entities::ReactionProcessEditor::SampleEntity'

      private

      def preparations
        object.preparations || []
      end

      def equipment
        object.equipment || []
      end
    end
  end
end
