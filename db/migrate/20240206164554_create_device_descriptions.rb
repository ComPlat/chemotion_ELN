# frozen_string_literal: true

class CreateDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    create_table :device_descriptions do |t|
      t.string   :access_comments
      t.string   :access_options
      t.string   :ancestry
      t.string   :application_name
      t.string   :application_version
      t.string   :building
      t.jsonb    :contact_for_maintenance
      t.jsonb    :consumables_needed_for_maintenance
      t.integer  :created_by
      t.datetime :deleted_at
      t.text     :description
      t.text     :description_for_methods_part
      t.integer  :device_id
      t.string   :device_type
      t.string   :device_type_detail
      t.string   :general_tags, array: true, default: [], null: false
      t.boolean  :helpers_uploaded, default: false
      t.string   :infrastructure_assignment
      t.string   :institute
      t.string   :maintenance_contract_available
      t.string   :maintenance_scheduling
      t.text     :measures_after_full_shut_down
      t.text     :measures_after_short_shut_down
      t.text     :measures_to_plan_offline_period
      t.string   :name
      t.string   :operation_mode
      t.jsonb    :operators
      t.jsonb    :ontologies
      t.jsonb    :planned_maintenance
      t.text     :policies_and_user_information
      t.text     :restart_after_planned_offline_period
      t.string   :room
      t.string   :serial_number
      t.jsonb    :setup_descriptions
      t.string   :size
      t.string   :short_label
      t.jsonb    :unexpected_maintenance
      t.string   :university_campus
      t.string   :vendor_id
      t.string   :vendor_url
      t.text     :version_characterization
      t.string   :version_doi
      t.string   :version_doi_url
      t.string   :version_identifier_type
      t.datetime :version_installation_start_date
      t.datetime :version_installation_end_date
      t.string   :version_number
      t.string   :weight
      t.string   :weight_unit
      t.string   :vendor_device_name
      t.string   :vendor_device_id
      t.string   :vendor_company_name
      t.timestamps
    end
    add_index :device_descriptions, :ancestry
    add_index :device_descriptions, :device_id
  end
end
