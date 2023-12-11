# frozen_string_literal: true

module Entities
  class DeviceDescriptionEntity < Grape::Entity
    expose :id
    expose :device_id
    expose :name
    expose :short_label
    expose :vendor_name
    expose :vendor_id
    expose :vendor_url
    expose :serial_number
    expose :doi
    expose :doi_url
    expose :device_type
    expose :device_type_detail
    expose :operation_mode
    expose :installation_start_date
    expose :installation_end_date
    expose :description_and_comments
    expose :technical_operator
    expose :administrative_operator
    expose :university_campus
    expose :institute
    expose :building
    expose :room
    expose :infrastructure_assignment
    expose :access_options
    expose :comments
    expose :size
    expose :weight
    expose :application_name
    expose :application_version
    expose :description_for_methods_part
  end
end
