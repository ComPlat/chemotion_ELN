module Entities
  class DeviceNovncEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "device id"}
    expose :name, documentation: { type: "String", desc: "device name" }
    expose :novnc, documentation: { type: "Hash", desc: "device Novnc" }

    def novnc
      object.profile.data['novnc']
    end
  end
end
