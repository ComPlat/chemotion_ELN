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
    expose :datacollector_fields, default: false
    expose :datacollector_method
    expose :datacollector_dir
    expose :datacollector_host
    expose :datacollector_user
    expose :datacollector_authentication
    expose :datacollector_number_of_files
    expose :datacollector_key_name
    expose :novnc_token
    expose :novnc_target
    expose :novnc_password
    expose :users, as: 'users', using: Entities::UserSimpleEntity
    expose :people, as: 'people', using: Entities::UserSimpleEntity
    expose :groups, as: 'groups', using: Entities::UserSimpleEntity
  end
end
