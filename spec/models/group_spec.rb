require 'rails_helper'

RSpec.describe 'Group', type: :model do
  describe 'creation' do
    let(:group) { create(:group) }

    it 'is possible to create a valid group(user)' do
      expect(group.valid?).to eq true
      expect(group.type).to eq 'Group'
    end

    it 'creates an All & chemotion.net collection' do
      expect(group.collections.pluck(:label)).to match_array ['All', 'chemotion.net']
    end
  end

  describe 'association with users' do

    let(:u1) { create(:user) }
    let(:u2) { create(:user) }
    let(:group) { create(:group,users:[u1,u2]) }


    it 'is possible to create a valid group with users' do
      expect(group.valid?).to eq true
      expect(group.type).to eq 'Group'
      expect(group.users).to_not be_empty
      expect(group.users).to match_array [u1,u2]
    end
  end

  describe 'association with admins' do

    let(:p1) { create(:person) }
    let(:p2) { create(:person) }
    let(:group) { create(:group,admins:[p1]) }


    it 'is possible to create a valid group with users' do
      expect(group.valid?).to eq true
      expect(group.admins).to_not be_empty
      expect(group.admins).to match_array [p1]
    end
  end
end
