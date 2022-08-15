# frozen_string_literal: true

module Entities
  # wraps a ReactionsSample object
  class ReactionMaterialEntity < ApplicationEntity
    SAMPLE_ENTITY = 'Entities::SampleEntity'.freeze

    expose(
      :coefficient,
      :equivalent,
      :position,
      :reference,
      :show_label,
      :waste,
    )

    expose :sample, using: SAMPLE_ENTITY, merge: true
  end
end
