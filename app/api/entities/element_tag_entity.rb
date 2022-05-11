# frozen_string_literal: true

module Entities
  class ElementTagEntity < ApplicationEntity
    expose(
      :data
    )

    with_options(format_with: :eln_timestamp) do
      expose :created_at
      expose :updated_at
    end

    private

    def data
      object.taggable_data
    end
  end
end
