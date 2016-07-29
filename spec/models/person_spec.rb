require 'rails_helper'

RSpec.describe 'Person', type: :model do
  describe 'creation' do
    let(:person) { create(:person) }

    it 'is possible to create a valid user-person' do
      expect(person.valid?).to eq true
      expect(person.type).to eq 'Person'
    end

    it 'creates an All & chemotion.net collection' do
      expect(person.collections.pluck(:label)).to match_array ['All', 'chemotion.net']
    end

    context 'when several groups contain the person,' do
      #let(:user) { create(:user) }
      let(:g1) {build(:group,users: [person])}
      let(:g2) {build(:group,users: [person])}
      before do
        g1.save!
        g2.save!
      end
      it 'has many groups' do
          expect(person.groups).to_not be_empty
          expect(person.groups).to match_array [g1,g2]
      end
    end

    context 'the user administrates several groups' do
      let(:p2) { create(:person) }
      let(:g1) {build(:group,admins: [person])}
      let(:g2) {build(:group,admins: [person,p2])}
      before do
        g1.save!
        g2.save!
      end
      it 'has many administrated_accounts' do
          expect(person.administrated_accounts).to_not be_empty
          expect(person.administrated_accounts).to match_array [g1,g2]
      end
    end

    context 'the person is in groups with shared collections' do
      let(:g1) {build(:group,users: [person])}
      let(:c1) {build(:collection, user: g1)}

      before do
        g1.save!
        c1.save!
      end
      it 'has (unlocked) collections through the group' do
          expect(person.group_collections).to_not be_empty
          expect(person.group_collections).to match_array [c1]
          expect(person.all_collections.unlocked).to match_array [c1]
      end
    end
  end
end
