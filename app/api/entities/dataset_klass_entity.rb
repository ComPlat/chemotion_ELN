# frozen_string_literal: true

module Entities
  # DatasetKlassEntity
  class DatasetKlassEntity < Grape::Entity
    expose :id, :uuid, :ols_term_id, :label, :desc, :properties_template, :properties_release, :is_active, :place, :released_at
    def released_at
      object.released_at&.strftime('%d.%m.%Y, %H:%M')
    end
  end
end
