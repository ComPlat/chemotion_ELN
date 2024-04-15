# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to have_many(:vessels).through(:collections) }
  it { is_expected.to have_many(:created_vessels).class_name('Vessel').inverse_of(:creator).dependent(nil) }

  describe 'creation' do
    let(:user) { build(:user) }
    let(:person) { build(:person) }
    let(:group) { build(:group) }
    let!(:user_deleted) { create(:person, email: 'user_deleted@eln.edu', name_abbreviation: 'UD') }

    it 'is possible to create a valid user' do
      expect(user.valid?).to be true
    end

    it 'is possible to create a valid person' do
      expect(person.valid?).to be true
    end

    it 'is possible to create a valid group' do
      expect(group.valid?).to be true
    end

    it 'validates the presence of email' do
      expect(build(:user, email: '')).not_to be_valid
    end

    it 'validates the presence of first_name' do
      expect(build(:user, first_name: '')).not_to be_valid
    end

    it 'validates the presence of last_name' do
      expect(build(:user, last_name: '')).not_to be_valid
    end

    it 'validates the presence of name_abbreviation' do
      expect(build(:user, name_abbreviation: '')).not_to be_valid
    end

    it 'validates the uniqueness of name_abbreviation' do
      user.save!
      expect(build(:user, name_abbreviation: user.name_abbreviation)).not_to be_valid
    end

    it 'validates the length of name_abbreviation for user' do
      expect(build(:user, name_abbreviation: 'asd')).to be_valid
      expect(build(:user, name_abbreviation: 'asdf')).not_to be_valid
    end

    it 'validates the format of valid name_abbreviation for user' do
      expect(build(:user, name_abbreviation: 'a-d')).to be_valid
      expect(build(:user, name_abbreviation: 'a1d')).to be_valid
      expect(build(:user, name_abbreviation: 'as1')).to be_valid
    end

    it 'validates the format of invalid name_abbreviation for user' do
      expect(build(:user, name_abbreviation: 'as_')).not_to be_valid
      expect(build(:user, name_abbreviation: 'as-')).not_to be_valid
    end

    it 'validates the format of valid name_abbreviation for group' do
      expect(build(:group, name_abbreviation: 'a1-1d')).to be_valid
      expect(build(:group, name_abbreviation: 'a_0_a')).to be_valid
      expect(build(:group, name_abbreviation: 'asdf1')).to be_valid
    end

    it 'validates the format of invalid name_abbreviation for group' do
      expect(build(:group, name_abbreviation: 'asdf-')).not_to be_valid
      expect(build(:group, name_abbreviation: 'asdf_')).not_to be_valid
    end

    it 'validates the length of name_abbreviation for group' do
      expect(build(:group, name_abbreviation: 'asdfg')).to be_valid
      expect(build(:group, name_abbreviation: 'asdfgh')).not_to be_valid
    end

    it 'creates an All collection' do
      user.save!
      expect(user.collections.find_by(label: 'All', is_locked: true)).not_to be_nil
    end

    it 'reset email after soft deletion' do
      user_deleted.destroy!
      expect(User.with_deleted.find_by(email: 'user_deleted@eln.edu')).to be_nil
      expect(User.only_deleted.where('email LIKE ?', "#{user_deleted.id}_%").where('email LIKE ?',
                                                                                   '%@deleted').present?).to be true
    end
  end

  describe 'try_find_by_name_abbreviation' do
    let!(:user) { create(:group, name_abbreviation: 'UzER') }
    let!(:user_lower) { create(:group, name_abbreviation: 'UZZEr') }
    let!(:user_upper) { create(:group, name_abbreviation: 'UZZER') }

    it 'finds a user by name_abbreviation' do
      expect(User.try_find_by_name_abbreviation(user_upper.name_abbreviation)).to eq user_upper
      expect(User.try_find_by_name_abbreviation(user.name_abbreviation)).to eq user
    end

    it 'finds a user by name_abbreviation with different case' do
      expect(User.try_find_by_name_abbreviation(user.name_abbreviation.upcase)).to eq user
    end

    it 'can not find a uniq user by name_abbreviation with different case' do
      expect(User.try_find_by_name_abbreviation(user_lower.name_abbreviation.downcase)).to be_nil
    end
  end
end
