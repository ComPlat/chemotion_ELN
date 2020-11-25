module Entities
    class SegmentKlassEntity < Grape::Entity
      expose :id, :label, :desc, :properties_template, :is_active, :place
      expose :element_klass, using: Entities::ElementKlassEntity
    end
  end
