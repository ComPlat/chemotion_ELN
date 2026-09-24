# frozen_string_literal: true

# == Schema Information
#
# Table name: affiliations
#
#  id           :integer          not null, primary key
#  company      :string
#  country      :string
#  organization :string
#  department   :string
#  group        :string
#  created_at   :datetime
#  updated_at   :datetime
#  from         :date
#  to           :date
#  domain       :string
#  cat          :string
#
require 'rails_helper'

RSpec.describe Affiliation do
  subject(:affiliation) do
    described_class.new(group: 'AK Doe', department: 'IOC', organization: 'KIT', country: 'Germany')
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:organization) }
  end

  describe 'associations' do
    it { is_expected.to have_many(:user_affiliations).dependent(:destroy) }
    it { is_expected.to have_many(:users).through(:user_affiliations) }
  end

  describe '#output_array_full' do
    it 'lists group, department, organization and country in that order' do
      expect(affiliation.output_array_full).to eq ['AK Doe', 'IOC', 'KIT', 'Germany']
    end
  end

  describe '#output_full' do
    it 'joins all parts with commas' do
      expect(affiliation.output_full).to eq 'AK Doe, IOC, KIT, Germany'
    end

    context 'when some parts are blank' do
      it 'skips nil and empty parts' do
        affiliation.assign_attributes(group: nil, department: '  ')

        expect(affiliation.output_full).to eq 'KIT, Germany'
      end
    end
  end
end
