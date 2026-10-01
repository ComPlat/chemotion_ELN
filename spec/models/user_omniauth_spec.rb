# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  describe '#generate_unique_name_abbreviation' do
    it 'derives initials and assigns a valid unique abbreviation' do
      user = described_class.new(
        type: 'Person', first_name: 'Alice', last_name: 'Brown',
        email: 'a.brown@bar.de', password: 'testtest'
      )

      abbr = user.generate_unique_name_abbreviation

      expect(abbr).to eq('ab')
      expect(user.name_abbreviation).to eq('ab')
      expect(user).to be_valid
    end

    it 'appends a suffix when the initials are already taken' do
      create(:person, first_name: 'Alan', last_name: 'Bell', name_abbreviation: 'ab')
      user = described_class.new(
        type: 'Person', first_name: 'Adam', last_name: 'Black',
        email: 'a.black@bar.de', password: 'testtest'
      )

      abbr = user.generate_unique_name_abbreviation

      expect(abbr).not_to eq('ab')
      expect(abbr.length).to be_between(2, 3)
      expect(user).to be_valid
    end

    it 'returns nil and leaves the abbreviation blank when the space is exhausted' do
      user = described_class.new(type: 'Person', first_name: 'Alice', last_name: 'Brown')
      allow(user).to receive(:name_abbreviation_acceptable?).and_return(false)

      expect(user.generate_unique_name_abbreviation).to be_nil
      expect(user.name_abbreviation).to be_nil
    end
  end

  describe '.find_or_create_from_omniauth!' do
    let(:params) do
      {
        provider: 'ldap', uid: 'abrown', email: 'a.brown@bar.de',
        first_name: 'Alice', last_name: 'Brown', groups: []
      }
    end

    it 'creates a new persisted user' do
      expect { described_class.find_or_create_from_omniauth!(params) }.to change(described_class, :count).by(1)
    end

    it 'provisions an active Person with the provider linkage', :aggregate_failures do
      described_class.find_or_create_from_omniauth!(params)
      user = described_class.find_by(email: 'a.brown@bar.de')

      expect(user).to be_persisted
      expect(user.account_active).to be(true)
      expect(user.providers['ldap']).to eq('abrown')
    end

    it 'creates the default All collection' do
      user = described_class.find_or_create_from_omniauth!(params)

      expect(user.collections.where(label: 'All')).to exist
    end

    it 'links the provider onto an existing user matched by email' do
      existing = create(:person, email: 'a.brown@bar.de')

      expect { described_class.find_or_create_from_omniauth!(params) }.not_to change(described_class, :count)
      expect(existing.reload.providers['ldap']).to eq('abrown')
    end

    it 'returns an unsaved user when no unique abbreviation can be generated' do
      allow_any_instance_of(described_class).to receive(:generate_unique_name_abbreviation).and_return(nil) # rubocop:disable RSpec/AnyInstance

      user = described_class.find_or_create_from_omniauth!(params)

      expect(user).not_to be_persisted
    end
  end
end
