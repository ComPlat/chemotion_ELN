module Entities
    class ElementKlassEntity < Grape::Entity
      expose :id, :name, :label, :desc, :icon_name, :properties_template, :is_active, :klass_prefix, :is_generic, :place
    end
  end
