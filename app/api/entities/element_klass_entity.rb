# frozen_string_literal: true

module Entities
  # ElementKlassEntity
  class ElementKlassEntity < Grape::Entity
    expose :id, :uuid, :name, :label, :desc, :icon_name, :properties_release, :properties_template, :is_active, :klass_prefix, :is_generic, :place, :released_at
    def released_at
      object.released_at&.strftime('%d.%m.%Y, %H:%M')
    end
  end
end
