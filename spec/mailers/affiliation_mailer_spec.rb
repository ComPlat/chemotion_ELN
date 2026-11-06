# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AffiliationMailer do
  describe '.suggestion_submitted' do
    it 'hides the reviewers from each other', :aggregate_failures do
      create(:admin, email: 'admin1@example.com')
      create(:admin, email: 'admin2@example.com')
      suggestion = create(:affiliation_suggestion, user: create(:person), organization: 'KIT')

      mail = described_class.suggestion_submitted(suggestion.id)
      expect(mail.to).to be_blank
      expect(mail.bcc).to include('admin1@example.com', 'admin2@example.com')
    end

    it 'sends nothing when the suggestion was withdrawn before the job ran' do
      create(:admin)
      suggestion = create(:affiliation_suggestion, user: create(:person), organization: 'KIT')
      suggestion.destroy!

      expect { described_class.suggestion_submitted(suggestion.id).deliver_now }
        .not_to change(ActionMailer::Base.deliveries, :count)
    end
  end
end
