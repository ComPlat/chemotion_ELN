# frozen_string_literal: true

module Entities
  class DeviceDescriptionEntity < Grape::Entity
    expose :id
    expose :device_id
    expose :name
    expose :short_label
    expose :device_type
    expose :device_type_detail
    expose :operation_mode
    expose :vendor_device_name
    expose :vendor_device_id
    expose :serial_number
    expose :vendor_company_name
    expose :vendor_id
    expose :description
    expose :tags
    expose :version_number
    expose :version_installation_start_date
    expose :version_installation_end_date
    expose :version_doi
    expose :version_doi_url
    expose :version_characterization
    expose :operators
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
    expose :vendor_url
    expose :policies_and_user_information
    expose :description_for_methods_part
    expose :type
    expose :changed
    expose :container, using: 'Entities::ContainerEntity'
    expose :attachments, using: 'Entities::AttachmentEntity'
    expose :ontologies
    expose :segments, using: 'Labimotion::SegmentEntity'

    def type
      'device_description'
    end

    def changed
      false
    end
  end
end
