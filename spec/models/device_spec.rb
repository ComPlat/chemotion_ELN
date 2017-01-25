require 'rails_helper'

RSpec.describe Device, type: :model do
  let(:user) { create(:user) }
  let(:device) { create(:device, user_id: user.id) }
  let(:user_2) { create(:user, selected_device_id: device.id) }

  it "handles user device relationship correctly" do
    expect(device.user.id).to eq user.id
    expect(user_2.selected_device).to eq device
  end
end
