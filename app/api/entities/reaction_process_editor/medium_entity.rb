# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class MediumEntity < Grape::Entity
      expose(
        :id, :sum_formula, :label, :short_label, :preferred_label, :sample_name, :molecule_name
      )

      # :label, :short_label, :preferred_label for compatibitility with SampleEntity.
      # We would need probably only one of them.
    end
  end
end
