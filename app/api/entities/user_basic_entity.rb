module Entities
  class UserBasicEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "User's unique id"}
    expose :name, documentation: { type: "String", desc: "User's name" }
    expose :initials, documentation: { type: "String", desc: "initials" }
    expose :type, documentation: { type: "String", desc: "User's type" }
  end
end
