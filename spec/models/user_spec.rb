require 'rails_helper'

RSpec.describe 'User', type: :model do
  describe 'creation' do
    let(:user) { build(:user) }
    let(:person) { build(:person) }
    let(:group) { build(:group) }
    let!(:user_deleted) { create(:person, email: 'user_deleted@eln.edu', name_abbreviation: 'UD') }


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
      expect(FactoryBot.build(:user, :email => "")).to_not be_valid
    end

    it 'validates the presence of first_name' do
      expect(FactoryBot.build(:user, :first_name => "")).to_not be_valid
    end

    it 'validates the presence of last_name' do
      expect(FactoryBot.build(:user, :last_name => "")).to_not be_valid
    end

    it 'validates the presence of name_abbreviation' do
      expect(FactoryBot.build(:user, :name_abbreviation => "")).to_not be_valid
    end

    it 'validates the uniqueness of name_abbreviation' do
      user.save!
      expect(FactoryBot.build(:user, :name_abbreviation => user.name_abbreviation)).to_not be_valid
    end

    it 'validates the length of name_abbreviation for user' do
      expect(FactoryBot.build(:user, :name_abbreviation => "asd")).to be_valid
      expect(FactoryBot.build(:user, :name_abbreviation => "asdf")).to_not be_valid
    end

    it 'validates the format of name_abbreviation for user' do
      expect(FactoryBot.build(:user, :name_abbreviation => "a-d")).to be_valid
      expect(FactoryBot.build(:user, :name_abbreviation => "a1d")).to be_valid
      expect(FactoryBot.build(:user, :name_abbreviation => "as_")).to_not be_valid
      expect(FactoryBot.build(:user, :name_abbreviation => "as-")).to_not be_valid
      expect(FactoryBot.build(:user, :name_abbreviation => "as1")).to be_valid
    end

    it 'validates the format of name_abbreviation for group' do
      expect(FactoryBot.build(:group, :name_abbreviation => "a1-1d")).to be_valid
      expect(FactoryBot.build(:group, :name_abbreviation => "a_0_a")).to be_valid
      expect(FactoryBot.build(:group, :name_abbreviation => "asdf_")).to_not be_valid
      expect(FactoryBot.build(:group, :name_abbreviation => "asdf-")).to_not be_valid
      expect(FactoryBot.build(:group, :name_abbreviation => "asdf1")).to be_valid
    end

    it 'validates the length of name_abbreviation for group' do
      expect(FactoryBot.build(:group, :name_abbreviation => "asdfg")).to be_valid
      expect(FactoryBot.build(:group, :name_abbreviation => "asdfgh")).to_not be_valid
    end

    it 'creates an All collection' do
      user.save!
      expect(user.collections.find_by(label: 'All', is_locked: true)).to_not be_nil
    end

    it 'reset email after soft deletion' do
      user_deleted.destroy!
      expect(User.with_deleted.find_by(email: 'user_deleted@eln.edu')).to be_nil
      expect(User.only_deleted.where("email LIKE ?", "#{user_deleted.id}_%").where("email LIKE ?", '%@deleted').present?).to be true
    end
  end
end
