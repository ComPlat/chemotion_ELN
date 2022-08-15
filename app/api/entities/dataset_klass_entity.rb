# frozen_string_literal: true

module Entities
  class DatasetKlassEntity < ApplicationEntity
    expose(
      :desc,
      :id,
      :is_active,
      :label,
      :ols_term_id,
      :place,
      :properties_release,
      :properties_template,
      :uuid,
    )
    expose_timestamps(timestamp_fields: [:released_at])
  end
end
