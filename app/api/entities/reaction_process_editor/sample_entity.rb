# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class SampleEntity < Grape::Entity
      expose :id
      expose :short_label
      expose :sample_svg_file
      expose :metrics
      expose :location
      expose :hide_in_eln

      expose :target_amount
      expose :amounts
      expose :icon

      expose :intermediate_type

      private

      def intermediate_type
        ReactionsIntermediateSample
          .find_by(sample: object)
          &.intermediate_type
      end

      def target_amount
        ::ReactionProcessEditor::SampleAmountsConverter.to_rpe(object)
      end

      def amounts
        {
          mg: object.amount_mg,
          mmol: object.amount_mmol,
          ml: object.amount_ml,
        }
      end

      def icon
        object.sample_svg_file
      end
    end
  end
end
