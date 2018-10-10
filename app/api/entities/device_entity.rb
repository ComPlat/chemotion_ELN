module Entities
  class DeviceEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "device id"}
    expose :name, documentation: { type: "String", desc: "device name" }
    expose :data, :name_abbreviation, :type

    def data
      object.profile.data
    end
  end
end
