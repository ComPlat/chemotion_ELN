# frozen_string_literal: true

# == Schema Information
#
# Table name: users_devices
#
#  id        :integer          not null, primary key
#  user_id   :integer
#  device_id :integer
#
require 'rails_helper'

RSpec.describe UsersDevice do
  describe 'associations' do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:device) }
  end

  describe '.by_user_ids' do
    let(:device) { create(:device) }
    let(:user) { create(:person) }
    let(:group) { create(:group) }
    let!(:user_link) { described_class.create!(user: user, device: device) }
    let!(:group_link) { described_class.create!(user: group, device: device) }

    before { described_class.create!(user: create(:person), device: device) }

    it 'returns the links of the given users' do
      expect(described_class.by_user_ids([user.id, group.id])).to contain_exactly(user_link, group_link)
    end

    it 'accepts a single id' do
      expect(described_class.by_user_ids(user.id)).to contain_exactly(user_link)
    end
  end
end
