module Entities
  class CodeLogEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "CodeLog's unique id"}
    expose :value, :source, :source_id, :root_code, :value_sm

    private
    def root_code
      return {} unless (!object.respond_to? :source || object.source == "container")
      if (object.respond_to? :source)
        element = Container.find(object.source_id).root.containable
        element && self.class.represent(element, serializable: true) || {}
      end
    end
  end
end
