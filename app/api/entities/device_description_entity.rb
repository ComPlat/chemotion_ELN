# frozen_string_literal: true

module Entities
  class DeviceDescriptionEntity < ApplicationEntity
    expose :id
    expose :device_id
    expose :name
    expose :short_label
    expose :device_type_name
    expose :device_type_id
    expose :device_type_id_type
    expose :device_class
    expose :device_class_detail
    expose :operation_mode
    expose :vendor_device_name
    expose :vendor_device_id
    expose :serial_number
    expose :vendor_company_name
    expose :vendor_id
    expose :description
    expose :general_tags
    expose :version_number
    expose :version_installation_start_date
    expose :version_installation_end_date
    expose :version_identifier_type
    expose :version_doi
    expose :version_doi_url
    expose :version_characterization
    expose :operators
    expose :owner_institution
    expose :owner_email
    expose :owner_id
    expose :owner_id_type
    expose :inventory_id
    expose :alternative_identifier
    expose :vendor_id_type
    expose :university_campus
    expose :institute
    expose :building
    expose :room
    expose :infrastructure_assignment
    expose :access_options
    expose :access_comments
    expose :size
    expose :weight
    expose :weight_unit
    expose :application_name
    expose :application_version
    expose :vendor_url
    expose :helpers_uploaded
    expose :policies_and_user_information
    expose :description_for_methods_part
    expose :type
    expose :changed
    expose :container, using: 'Entities::ContainerEntity'
    expose :attachments, using: 'Entities::AttachmentEntity'
    expose :ontologies
    expose :segments, using: 'Labimotion::SegmentEntity'
    expose :comments, using: 'Entities::CommentEntity'
    expose :comment_count
    expose :tag, using: 'Entities::ElementTagEntity'
    expose! :can_copy, unless: :displayed_in_list
    expose! :ancestor_ids
    expose :setup_descriptions
    expose :maintenance_contract_available
    expose :maintenance_scheduling
    expose :contact_for_maintenance
    expose :planned_maintenance
    expose :consumables_needed_for_maintenance
    expose :unexpected_maintenance
    expose :measures_after_full_shut_down
    expose :measures_after_short_shut_down
    expose :measures_to_plan_offline_period
    expose :restart_after_planned_offline_period

    expose_timestamps

    private

    def type
      'device_description'
    end

    def changed
      false
    end

    def comment_count
      object.comments.count
    end
  end
end
