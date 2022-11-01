# frozen_string_literal: true

module Entities
  class DeviceEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "device id"}
    expose :name, documentation: { type: "String", desc: "device name" }
    expose :data, :name_abbreviation, :type
    expose :device_metadata, using: Entities::DeviceMetadataEntity

    def data
      if object.respond_to? :profile
        object.profile.data  if object.profile.respond_to? :data
      end
    end
  end
end
