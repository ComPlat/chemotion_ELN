# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class MediumEntity < Grape::Entity
      expose(
        :id, :sum_formula, :label, :short_label, :name, :molecule_name
      )

      def label
        object.name
      end
      # :label, :short_label for compatibitility with SampleEntity.
      # We would need probably only one of them.
    end
  end
end
