# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Device, type: :model do
  let(:user) { create(:person) }
  let(:device) { create(:device) }

  before do
    device.users << user
    device.save
  end

  it 'handles user device relationship correctly' do
    expect(device.users).to eq Person.where id: user.id
  end
end
