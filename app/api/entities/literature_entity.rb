# frozen_string_literal: true

module Entities
  class LiteratureEntity < ApplicationEntity
    expose(
      :id,
      :title,
      :type,
      :url,
    )
    with_options(format_with: :eln_timestamp) do
      expose :created_at
      expose :updated_at
    end
    
    def type
      'literature'
    end
  end
end
