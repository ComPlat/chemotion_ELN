# frozen_string_literal: true

module Entities
  # The device fields the "My Groups & Devices" dialog lists.
  class DeviceSimpleEntity < ApplicationEntity
    expose :id, documentation: { type: 'Integer', desc: 'device id' }
    expose :name, documentation: { type: 'String', desc: 'device name' }
    expose :name_abbreviation, documentation: { type: 'String', desc: 'device name abbreviation' }
  end
end
