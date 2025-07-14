# frozen_string_literal: true

# rubocop: disable Metrics/ClassLength

module Versioning
  module Serializers
    class DeviceDescriptionSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Device Description Properties'])
        new(record: record, name: name).call
      end

      # rubocop:disable Metrics/MethodLength
      def field_definitions
        {
          created_at: {
            label: 'Created at',
            kind: :date,
          },
          name: {
            label: 'Name',
            revert: %i[name],
          },
          device_type: {
            label: 'Device type',
            revert: %i[device_type],
          },
          device_type_detail: {
            label: 'Device type detail',
            revert: %i[device_type_detail],
          },
          operation_mode: {
            label: 'Operation mode',
            revert: %i[operation_mode],
          },
          # General description
          vendor_device_name: {
            label: "Device's Name",
            revert: %i[vendor_device_name],
          },
          vendor_device_id: {
            label: "Device's ID",
            revert: %i[vendor_device_id],
          },
          serial_number: {
            label: 'Serial no',
            revert: %i[serial_number],
          },
          vendor_company_name: {
            label: "Company's name - brand",
            revert: %i[vendor_company_name],
          },
          vendor_id: {
            label: "Vendor's ID",
            revert: %i[vendor_id],
          },
          description: {
            label: 'Description',
            revert: %i[description],
          },
          general_tags: {
            label: 'Tags',
            formatter: array_formatter,
            revert: %i[general_tags],
          },
          # Version specific information
          version_number: {
            label: 'Version',
            revert: %i[version_number],
          },
          version_installation_start_date: {
            label: 'Installation date',
            revert: %i[version_installation_start_date],
          },
          version_installation_end_date: {
            label: 'End date',
            revert: %i[version_installation_end_date],
          },
          version_identifier_type: {
            label: 'Persistent identifier type',
            revert: %i[version_identifier_type],
          },
          version_doi: {
            label: 'Persistent identifier value',
            revert: %i[version_doi],
          },
          version_doi_url: {
            label: 'Persistent identifier link',
            revert: %i[version_doi],
          },
          version_characterization: {
            label: 'Characterization of this version',
            revert: %i[version_doi],
          },
          # Device operators and location
          operators: {
            label: 'Operators',
            formatter: array_formatter,
            revert: %i[operators],
          },
          university_campus: {
            label: 'Institution',
            revert: %i[university_campus],
          },
          institute: {
            label: 'Institute',
            revert: %i[institute],
          },
          building: {
            label: 'Building',
            revert: %i[building],
          },
          room: {
            label: 'Room',
            revert: %i[room],
          },
          infrastructure_assignment: {
            label: 'Infrastructure Assignment',
            revert: %i[infrastructure_assignment],
          },
          access_options: {
            label: 'Access options',
            revert: %i[access_options],
          },
          access_comments: {
            label: 'Comments',
            revert: %i[access_comments],
          },
          # Setup description
          setup_descriptions: {
            label: 'Setup descriptions',
            formatter: array_formatter,
            revert: %i[setup_descriptions],
          },
          # Software and interfaces
          application_name: {
            label: 'Application name',
            revert: %i[application_name],
          },
          application_version: {
            label: 'Application version',
            revert: %i[application_version],
          },
          vendor_url: {
            label: 'Vendor URL',
            revert: %i[vendor_url],
          },
          # Manuals, documentation and helpers
          helpers_uploaded: {
            label: 'Helpers uploaded?',
            revert: %i[helpers_uploaded],
          },
          policies_and_user_information: {
            label: 'Policies and user information',
            revert: %i[policies_and_user_information],
          },
          # Information for publications
          description_for_methods_part: {
            label: 'Description for methods part',
            revert: %i[description_for_methods_part],
          },
          # Physical descriptions
          size: {
            label: 'Size',
            revert: %i[size],
          },
          weight: {
            label: 'Weight',
            revert: %i[weight],
          },
          weight_unit: {
            label: 'Weight unit',
            revert: %i[weight_unit],
          },
          # Maintenance
          maintenance_contract_available: {
            label: 'Maintenance contract available',
            revert: %i[maintenance_contract_available],
          },
          maintenance_scheduling: {
            label: 'Maintenance scheduling',
            revert: %i[maintenance_scheduling],
          },
          contact_for_maintenance: {
            label: 'Contact for maintenance and repair',
            formatter: array_formatter,
            revert: %i[contact_for_maintenance],
          },
          planned_maintenance: {
            label: 'Planned maintenance',
            formatter: array_formatter,
            revert: %i[planned_maintenance],
          },
          consumables_needed_for_maintenance: {
            label: 'Consumables needed for maintenance',
            formatter: array_formatter,
            revert: %i[consumables_needed_for_maintenance],
          },
          unexpected_maintenance: {
            label: 'Unexpected maintenance and repair',
            formatter: array_formatter,
            revert: %i[unexpected_maintenance],
          },
          measures_after_full_shut_down: {
            label: 'Measures after complete power shutdown',
            revert: %i[measures_after_full_shut_down],
          },
          measures_after_short_shut_down: {
            label: 'Measures for running a device with short shutdown period',
            revert: %i[measures_after_short_shut_down],
          },
          measures_to_plan_offline_period: {
            label: 'Measures to plan an offline period',
            revert: %i[measures_to_plan_offline_period],
          },
          restart_after_planned_offline_period: {
            label: 'Re-Start after planned offline time',
            revert: %i[restart_after_planned_offline_period],
          },
        }.with_indifferent_access
      end
      # rubocop:enable Metrics/MethodLength
    end
  end
end

# rubocop: enable Metrics/ClassLength
