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
