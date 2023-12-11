# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class SampleEntity < Grape::Entity
      expose :id
      expose :short_label
      expose :sample_svg_file
      expose :target_amount_unit
      expose :target_amount_value
      expose :metrics
      expose :location
      expose :hide_in_eln

      expose :amounts

      private

      def amounts
        {
          mg: object.amount_mg,
          mmol: object.amount_mmol,
          ml: object.amount_ml,
        }
      end
    end
  end
end
