# frozen_string_literal: true

module Entities
  class TextTemplateEntity < ApplicationEntity
    expose(
      :data,
      :id,
      :name,
      :type,
      :user_id,
    )
    expose_timestamps
  end
end
