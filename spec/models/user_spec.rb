require 'rails_helper'

RSpec.describe 'User', type: :model do
  describe 'creation' do
    let(:user) { build(:user) }
    let(:person) { build(:person) }
    let(:group) { build(:group) }


    it 'is possible to create a valid user' do
      expect(user.valid?).to eq true
    end

    it 'is possible to create a valid person' do
      expect(person.valid?).to eq true
    end

    it 'is possible to create a valid group' do
      expect(group.valid?).to eq true
    end

    it 'validates the presence of email' do
      expect(FactoryGirl.build(:user, :email => "")).to_not be_valid
    end

    it 'validates the presence of first_name' do
      expect(FactoryGirl.build(:user, :first_name => "")).to_not be_valid
    end

    it 'validates the presence of last_name' do
      expect(FactoryGirl.build(:user, :last_name => "")).to_not be_valid
    end

    it 'validates the presence of name_abbreviation' do
      expect(FactoryGirl.build(:user, :name_abbreviation => "")).to_not be_valid
    end

    it 'validates the uniqueness of name_abbreviation' do
      user.save!
      expect(FactoryGirl.build(:user, :name_abbreviation => user.name_abbreviation)).to_not be_valid
    end

    it 'validates the length of name_abbreviation for user' do
      expect(FactoryGirl.build(:user, :name_abbreviation => "asd")).to be_valid
      expect(FactoryGirl.build(:user, :name_abbreviation => "asdf")).to_not be_valid
    end

    it 'validates the format of name_abbreviation for user' do
      expect(FactoryGirl.build(:user, :name_abbreviation => "a-d")).to be_valid
      expect(FactoryGirl.build(:user, :name_abbreviation => "a1d")).to be_valid
      expect(FactoryGirl.build(:user, :name_abbreviation => "as_")).to_not be_valid
      expect(FactoryGirl.build(:user, :name_abbreviation => "as-")).to_not be_valid
      expect(FactoryGirl.build(:user, :name_abbreviation => "as1")).to be_valid
    end

    it 'validates the format of name_abbreviation for group' do
      expect(FactoryGirl.build(:group, :name_abbreviation => "a1-1d")).to be_valid
      expect(FactoryGirl.build(:group, :name_abbreviation => "a_0_a")).to be_valid
      expect(FactoryGirl.build(:group, :name_abbreviation => "asdf_")).to_not be_valid
      expect(FactoryGirl.build(:group, :name_abbreviation => "asdf-")).to_not be_valid
      expect(FactoryGirl.build(:group, :name_abbreviation => "asdf1")).to be_valid
    end

    it 'validates the length of name_abbreviation for group' do
      expect(FactoryGirl.build(:group, :name_abbreviation => "asdfg")).to be_valid
      expect(FactoryGirl.build(:group, :name_abbreviation => "asdfgh")).to_not be_valid
    end

    it 'creates an All collection' do
      user.save!
      expect(user.collections.find_by(label: 'All', is_locked: true)).to_not be_nil
    end
  end
end
