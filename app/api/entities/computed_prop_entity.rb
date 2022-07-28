# frozen_string_literal: true

module Entities
  class ComputedPropEntity < ApplicationEntity
    expose(
      :id,
      :sample_id,
      :status,
    )
    expose :updated_at, format_with: :eln_timestamp
  end
end
