# frozen_string_literal: true

module Entities
  class SegmentKlassEntity < ApplicationEntity
    expose(
      :desc,
      :id,
      :is_active,
      :label,
      :place,
      :properties_release,
      :properties_template,
      :uuid,
    )
    expose :element_klass, using: Entities::ElementKlassEntity
    expose_timestamps(timestamp_fields: [:released_at])
  end
end
