module Entities
  class DeviceEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "device id"}
    expose :name, documentation: { type: "String", desc: "device name" }
    expose :data, :name_abbreviation, :type

    def data
      if object.respond_to? :profile
        object.profile.data  if object.profile.respond_to? :data
      end
    end
  end
end
