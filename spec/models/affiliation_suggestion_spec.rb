# frozen_string_literal: true

# == Schema Information
#
# Table name: affiliation_suggestions
#
#  id             :bigint           not null, primary key
#  country        :string
#  department     :string
#  group          :string
#  organization   :string
#  status         :integer          default("pending"), not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  affiliation_id :integer
#  ror_id         :string
#  target_user_affiliation_id :integer
#  user_id        :integer          not null
#
# Indexes
#
#  index_affiliation_suggestions_on_status   (status)
#  index_affiliation_suggestions_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
require 'rails_helper'

RSpec.describe AffiliationSuggestion, type: :model do
  let(:user) { create(:person) }

  describe 'validations' do
    it 'is valid without organization (department-only suggestion)' do
      suggestion = build(:affiliation_suggestion, user: user, organization: nil, department: 'IOC')
      expect(suggestion).to be_valid
    end

    it 'is valid with organization and user' do
      suggestion = build(:affiliation_suggestion, user: user, organization: 'KIT')
      expect(suggestion).to be_valid
    end
  end

  describe 'status enum' do
    it 'defaults to pending' do
      suggestion = create(:affiliation_suggestion, user: user, organization: 'KIT')
      expect(suggestion).to be_pending
    end

    it 'can be approved' do
      suggestion = create(:affiliation_suggestion, user: user, organization: 'KIT')
      suggestion.approved!
      expect(suggestion).to be_approved
    end

    it 'can be rejected' do
      suggestion = create(:affiliation_suggestion, user: user, organization: 'KIT')
      suggestion.rejected!
      expect(suggestion).to be_rejected
    end
  end
end
