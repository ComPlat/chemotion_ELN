module Entities
  class UserEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "User's unique id"}
    expose :name, documentation: { type: "String", desc: "User's name" }
    expose :initials, documentation: { type: "String", desc: "initials" }
    expose :samples_count, documentation: { type: "Integer", desc: "Sample count"}
    expose :reactions_count, documentation: { type: "Integer", desc: "Reactions count"}
    expose :type, if: -> (obj, opts) { obj.respond_to? :type}
    expose :reaction_name_prefix, if: -> (obj, opts) { obj.respond_to? :reaction_name_prefix}
    expose :layout, if: -> (obj, opts) { obj.respond_to? :layout}
    expose :is_templates_moderator, if: -> (obj, opts) { obj.respond_to? :is_templates_moderator}

    def samples_count
      object.counters['samples'].to_i
    end

    def reactions_count
      object.counters['reactions'].to_i
    end
  end

end
