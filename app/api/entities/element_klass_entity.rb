# frozen_string_literal: true

module Entities
  class ElementKlassEntity < ApplicationEntity
    expose(
      :desc
      :icon_name
      :id
      :is_active
      :is_generic
      :klass_prefix
      :label
      :name
      :place
      :properties_release
      :properties_template
      :uuid
    )

    expose_timestamps(timestamp_fields: [:released_at])
  end
end
