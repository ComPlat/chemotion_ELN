# frozen_string_literal: true

# == Schema Information
#
# Table name: third_party_apps
#
#  id         :bigint           not null, primary key
#  url        :string
#  name       :string(100)      not null
#  file_types :string(100)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_third_party_apps_on_name  (name) UNIQUE
#
require 'rails_helper'

RSpec.describe ThirdPartyApp do
  subject(:app) { build(:third_party_app) }

  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:name) }
    it { is_expected.to validate_length_of(:name).is_at_most(100) }
    it { is_expected.to validate_presence_of(:url) }
    it { is_expected.to validate_uniqueness_of(:url) }
    it { is_expected.to validate_length_of(:url).is_at_most(100) }
    it { is_expected.to validate_presence_of(:file_types) }
  end

  describe 'factory' do
    it 'builds a valid record' do
      expect(app).to be_valid
    end
  end
end
