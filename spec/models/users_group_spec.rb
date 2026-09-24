# frozen_string_literal: true

# == Schema Information
#
# Table name: users_groups
#
#  id       :integer          not null, primary key
#  user_id  :integer
#  group_id :integer
#
# Indexes
#
#  index_users_groups_on_group_id  (group_id)
#  index_users_groups_on_user_id   (user_id)
#
require 'rails_helper'

RSpec.describe UsersGroup do
  let(:user) { create(:person) }
  let(:group) { create(:group) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:group) }
  end

  describe 'after_create :update_user_matrix' do
    before do
      allow(User).to receive(:find_by).and_call_original
      allow(User).to receive(:find_by).with(id: user.id).and_return(user)
      allow(user).to receive(:update_matrix)
    end

    it 'refreshes the matrix of the added user' do
      described_class.create!(user: user, group: group)

      expect(user).to have_received(:update_matrix)
    end

    it 'makes the user a member of the group' do
      described_class.create!(user: user, group: group)

      expect(group.reload.users).to contain_exactly(user)
    end
  end

  describe '#update_user_matrix' do
    it 'does nothing when the user does not exist' do
      users_group = described_class.new(user_id: 0, group: group)

      expect { users_group.update_user_matrix }.not_to raise_error
    end
  end
end
