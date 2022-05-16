# frozen_string_literal: true

module Entities
  class ElementTagEntity < ApplicationEntity
    expose(
      :taggable_data
    )

    expose_timestamps
  end
end
