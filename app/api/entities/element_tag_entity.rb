# frozen_string_literal: true

module Entities
  class ElementTagEntity < ApplicationEntity
    expose(
      :taggable_data,
      :taggable_id,
      :taggable_type,
    )

    expose_timestamps
  end
end
