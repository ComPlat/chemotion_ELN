# frozen_string_literal: true

# == Schema Information
#
# Table name: device_descriptions
#
#  id                           :bigint           not null, primary key
#  device_id                    :integer
#  name                         :string
#  short_label                  :string
#  vendor_name                  :string
#  vendor_id                    :string
#  vendor_url                   :string
#  serial_number                :string
#  doi                          :string
#  doi_url                      :string
#  device_type                  :string
#  device_type_detail           :string
#  operation_mode               :string
#  installation_start_date      :datetime
#  installation_end_date        :datetime
#  description_and_comments     :text
#  technical_operator           :jsonb
#  administrative_operator      :jsonb
#  university_campus            :string
#  institute                    :string
#  building                     :string
#  room                         :string
#  infrastructure_assignment    :string
#  access_options               :string
#  comments                     :string
#  size                         :string
#  weight                       :string
#  application_name             :string
#  application_version          :string
#  description_for_methods_part :text
#  created_at                   :datetime         not null
#  updated_at                   :datetime         not null
#
# Indexes
#
#  index_device_descriptions_on_device_id  (device_id)
#
class DeviceDescription < ApplicationRecord
  belongs_to :device, optional: true
end
