# frozen_string_literal: true

# == Schema Information
#
# Table name: device_descriptions
#
#  id                                   :bigint           not null, primary key
#  access_comments                      :string
#  access_options                       :string
#  alternative_identifier               :string
#  ancestry                             :string           default("/"), not null
#  application_name                     :string
#  application_version                  :string
#  building                             :string
#  consumables_needed_for_maintenance   :jsonb
#  contact_for_maintenance              :jsonb
#  created_by                           :integer
#  deleted_at                           :datetime
#  description                          :text
#  description_for_methods_part         :text
#  device_class                         :string
#  device_class_detail                  :string
#  device_type                          :string
#  general_tags                         :string           default([]), is an Array
#  helpers_uploaded                     :boolean          default(FALSE)
#  infrastructure_assignment            :string
#  institute                            :string
#  maintenance_contract_available       :string
#  maintenance_scheduling               :string
#  measures_after_full_shut_down        :text
#  measures_after_short_shut_down       :text
#  measures_to_plan_offline_period      :text
#  name                                 :string
#  ontologies                           :jsonb
#  operation_mode                       :string
#  operators                            :jsonb
#  owner_email                          :string
#  owner_institution                    :string
#  planned_maintenance                  :jsonb
#  policies_and_user_information        :text
#  restart_after_planned_offline_period :text
#  room                                 :string
#  serial_number                        :string
#  setup_descriptions                   :jsonb
#  short_label                          :string
#  size                                 :string
#  unexpected_maintenance               :jsonb
#  university_campus                    :string
#  vendor_company_name                  :string
#  vendor_device_name                   :string
#  vendor_id_type                       :string
#  vendor_url                           :string
#  version_characterization             :text
#  version_doi                          :string
#  version_doi_url                      :string
#  version_identifier_type              :string
#  version_installation_end_date        :datetime
#  version_installation_start_date      :datetime
#  version_number                       :string
#  weight                               :string
#  weight_unit                          :string
#  created_at                           :datetime         not null
#  updated_at                           :datetime         not null
#  device_id                            :integer
#  inventory_id                         :string
#  owner_id                             :string
#  vendor_device_id                     :string
#  vendor_id                            :string
#
# Indexes
#
#  index_device_descriptions_on_ancestry   (ancestry) WHERE (deleted_at IS NULL)
#  index_device_descriptions_on_device_id  (device_id)
#
require 'rails_helper'

# RSpec.describe DeviceDescription, type: :model do
# end
