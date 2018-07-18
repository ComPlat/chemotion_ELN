module Entities
  class GroupEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "Group's unique id"}
    expose :name, documentation: { type: "String", desc: "Group's name" }
    expose :initials, documentation: { type: "String", desc: "initials" }
    expose :users, as: 'users', using: Entities::UserSimpleEntity
    expose :admins, as: 'admins', using: Entities::UserSimpleEntity
  end
end
