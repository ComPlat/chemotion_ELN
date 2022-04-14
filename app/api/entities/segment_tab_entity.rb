# frozen_string_literal: true

module Entities
  class SegmentTabEntity < Grape::Entity
    expose :id, :uuid, :label, :desc, :properties_template, :properties_release, :is_active, :place, :released_at
    expose :element_klass, using: Entities::ElementKlassEntity

    def released_at
      object.released_at&.strftime('%d.%m.%Y, %H:%M')
    end
  end
end
