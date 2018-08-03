module Entities
  class ElementalCompositionEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "ElementalComposition's unique id"}
    expose :data, :loading, :description, :composition_type

    private
    def description
      ElementalComposition::TYPES[object.composition_type.to_sym]
    end

    def data
      object.data.sort_by {|key, value| key}.to_h
    end
  end
end
