# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::AdminAffiliationAPI do
  let!(:admin) { create(:admin) }
  let!(:user) { create(:person) }
  let!(:suggestion) { create(:affiliation_suggestion, user: user, organization: 'KIT', department: 'IOC') }

  describe 'GET /api/v1/admin/affiliation_suggestions' do
    context 'as admin' do
      before { allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin) }

      it 'lists pending suggestions' do
        get '/api/v1/admin/affiliation_suggestions'
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response.length).to eq(1)
      end
    end

    context 'as regular user' do
      before { allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user) }

      it 'returns 401' do
        get '/api/v1/admin/affiliation_suggestions'
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'PUT /api/v1/admin/affiliation_suggestions/:id/approve' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin)
      stub_const('AffiliationMailer', double('AffiliationMailer',
                                             suggestion_approved: double('mail', deliver_later: nil)))
    end

    it 'creates a UserAffiliation and marks suggestion approved' do
      expect {
        put "/api/v1/admin/affiliation_suggestions/#{suggestion.id}/approve"
      }.to change(UserAffiliation, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(suggestion.reload).to be_approved
      expect(suggestion.reload.affiliation_id).not_to be_nil
    end

    it 'approves a name-only suggestion without creating an affiliation' do
      name_only = create(:affiliation_suggestion, user: user, organization: nil, department: 'New Dept')

      expect {
        put "/api/v1/admin/affiliation_suggestions/#{name_only.id}/approve"
      }.not_to change(UserAffiliation, :count)

      expect(response).to have_http_status(:ok)
      expect(name_only.reload).to be_approved
      expect(name_only.affiliation_id).to be_nil
    end
  end

  describe 'PUT /api/v1/admin/affiliation_suggestions/:id/reject' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin)
      stub_const('AffiliationMailer', double('AffiliationMailer',
                                             suggestion_rejected: double('mail', deliver_later: nil)))
    end

    it 'marks suggestion rejected' do
      put "/api/v1/admin/affiliation_suggestions/#{suggestion.id}/reject"
      expect(response).to have_http_status(:ok)
      expect(suggestion.reload).to be_rejected
    end
  end
end
