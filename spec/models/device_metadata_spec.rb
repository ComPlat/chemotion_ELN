# == Schema Information
#
# Table name: device_metadata
#
#  id                      :integer          not null, primary key
#  data_cite_created_at    :datetime
#  data_cite_creator_name  :string
#  data_cite_last_response :jsonb
#  data_cite_prefix        :string
#  data_cite_state         :string           default("draft")
#  data_cite_updated_at    :datetime
#  data_cite_version       :integer
#  dates                   :jsonb
#  deleted_at              :datetime
#  description             :string
#  doi                     :string
#  doi_sequence            :integer
#  landing_page            :string
#  manufacturers           :jsonb
#  name                    :string
#  owners                  :jsonb
#  publication_year        :integer
#  publisher               :string
#  type                    :string
#  url                     :string
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  device_id               :integer
#
# Indexes
#
#  index_device_metadata_on_deleted_at  (deleted_at)
#  index_device_metadata_on_device_id   (device_id)
#
require 'rails_helper'

RSpec.describe DeviceMetadata, type: :model do
  let(:device) { create(:device) }
  let(:device_metadata) { create(:device_metadata) }

  before do
    device.device_metadata = device_metadata
    device.save
  end

  it 'handles device_metadata relationship correctly' do
    expect(device.device_metadata).to eq DeviceMetadata.find(device_metadata.id)
  end
end
