# frozen_string_literal: true

module Entities
  class DeviceEntity < Grape::Entity
    expose :id
    expose :name
    expose :name_abbreviation
    expose :initials
    expose :email
    expose :serial_number
    expose :verification_status
    expose :account_active
    expose :visibility
    expose :novnc_settings
    expose :datacollector_config
    expose :users, as: 'users', using: Entities::UserSimpleEntity
    expose :groups, as: 'groups', using: Entities::UserSimpleEntity
    expose :device_metadata
  end
end
