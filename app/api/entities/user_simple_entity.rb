# frozen_string_literal: true

module Entities
  class UserSimpleEntity < ApplicationEntity
    expose :id, documentation: { type: "Integer", desc: "User's unique id"}
    expose :name, documentation: { type: "String", desc: "User's name" }
    expose :initials, documentation: { type: "String", desc: "initials" }
    expose :type, if: -> (obj, opts) { obj.respond_to? :type }
  end
end
