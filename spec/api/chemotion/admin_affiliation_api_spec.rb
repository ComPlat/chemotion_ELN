# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::AdminAffiliationAPI do
  let!(:admin) { create(:admin) }
  let!(:user) { create(:person) }
  let!(:suggestion) { create(:affiliation_suggestion, user: user, organization: 'KIT', department: 'IOC') }
  let(:warden_instance) { instance_double(WardenAuthentication) }

  describe 'GET /api/v1/admin/affiliation_suggestions' do
    before { allow(WardenAuthentication).to receive(:new).and_return(warden_instance) }

    context 'when admin' do
      before { allow(warden_instance).to receive(:current_user).and_return(admin) }

      it 'lists pending suggestions' do
        get '/api/v1/admin/affiliation_suggestions'
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response.length).to eq(1)
      end
    end

    context 'when the user is an affiliation moderator' do
      let(:moderator) { create(:person) }

      before do
        moderator.profile.update!(data: moderator.profile.data.merge('is_affiliation_moderator' => true))
        allow(warden_instance).to receive(:current_user).and_return(moderator)
      end

      it 'lists pending suggestions' do
        get '/api/v1/admin/affiliation_suggestions'
        expect(response).to have_http_status(:ok)
      end
    end

    context 'when the user is not an admin' do
      before { allow(warden_instance).to receive(:current_user).and_return(user) }

      it 'returns 401' do
        get '/api/v1/admin/affiliation_suggestions'
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'PUT /api/v1/admin/affiliation_suggestions/:id/approve' do
    let(:mail_double) { instance_double(ActionMailer::MessageDelivery, deliver_later: nil) }
    let(:mailer_double) { class_double(AffiliationMailer, suggestion_approved: mail_double) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(admin)
      stub_const('AffiliationMailer', mailer_double)
    end

    it 'creates a UserAffiliation and marks suggestion approved', :aggregate_failures do
      expect do
        put "/api/v1/admin/affiliation_suggestions/#{suggestion.id}/approve"
      end.to change(UserAffiliation, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(suggestion.reload).to be_approved
      expect(suggestion.reload.affiliation_id).not_to be_nil
    end

    it 'applies edited fields before approving', :aggregate_failures do
      put "/api/v1/admin/affiliation_suggestions/#{suggestion.id}/approve", params: { department: 'ITC' }
      expect(response).to have_http_status(:ok)
      expect(suggestion.reload.department).to eq('ITC')
      expect(Affiliation.find(suggestion.affiliation_id).department).to eq('ITC')
    end

    it 'approves a name-only suggestion without creating an affiliation', :aggregate_failures do
      name_only = create(:affiliation_suggestion, user: user, organization: nil, department: 'New Dept')

      expect do
        put "/api/v1/admin/affiliation_suggestions/#{name_only.id}/approve"
      end.not_to change(UserAffiliation, :count)

      expect(response).to have_http_status(:ok)
      expect(name_only.reload).to be_approved
      expect(name_only.affiliation_id).to be_nil
    end

    it 'copies the ROR id onto the created affiliation' do
      with_ror = create(
        :affiliation_suggestion, user: user, organization: 'KIT', department: 'IFG', ror_id: '04t3en479'
      )
      put "/api/v1/admin/affiliation_suggestions/#{with_ror.id}/approve"
      expect(Affiliation.find(with_ror.reload.affiliation_id).ror_id).to eq('04t3en479')
    end

    it 'repoints the edited user affiliation instead of creating a new one' do
      original = Affiliation.create!(organization: 'KIT', department: 'IBCS', country: 'Germany')
      ua = UserAffiliation.create!(user: user, affiliation: original)
      sugg = create(:affiliation_suggestion,
                    user: user, organization: 'KIT', department: 'IBCS', group: 'Levkin',
                    country: 'Germany', target_user_affiliation_id: ua.id)

      put "/api/v1/admin/affiliation_suggestions/#{sugg.id}/approve"

      expect(ua.reload.affiliation.group).to eq('Levkin')
      expect(UserAffiliation.where(user: user).count).to eq(1)
    end
  end

  describe 'PUT /api/v1/admin/affiliation_suggestions/:id/reject' do
    let(:mail_double) { instance_double(ActionMailer::MessageDelivery, deliver_later: nil) }
    let(:mailer_double) { class_double(AffiliationMailer, suggestion_rejected: mail_double) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(admin)
      stub_const('AffiliationMailer', mailer_double)
    end

    it 'marks suggestion rejected' do
      put "/api/v1/admin/affiliation_suggestions/#{suggestion.id}/reject"
      expect(response).to have_http_status(:ok)
      expect(suggestion.reload).to be_rejected
    end
  end
end
