# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::AffiliationAPI do
  describe 'GET /api/v1/public/affiliations/departments' do
    before do
      Affiliation.create!(organization: 'KIT', department: 'IOC', country: 'Germany')
      Affiliation.create!(organization: 'KIT', department: 'ITC', country: 'Germany')
      Affiliation.create!(organization: 'MIT', department: 'Chemistry', country: 'US')
    end

    it 'returns all departments when no org filter' do
      get '/api/v1/public/affiliations/departments'
      expect(response).to have_http_status(:ok)
      expect(parsed_json_response).to include('IOC', 'ITC', 'Chemistry')
    end

    it 'returns only departments for the given organization' do
      get '/api/v1/public/affiliations/departments', params: { organization: 'KIT' }
      expect(parsed_json_response).to include('IOC', 'ITC')
      expect(parsed_json_response).not_to include('Chemistry')
    end

    it 'matches the organization case-insensitively' do
      get '/api/v1/public/affiliations/departments', params: { organization: 'kit' }
      expect(parsed_json_response).to include('IOC', 'ITC')
    end

    it 'scopes by ROR id when given' do
      Affiliation.create!(organization: 'KIT', department: 'IFG', country: 'Germany', ror_id: '04t3en479')
      get '/api/v1/public/affiliations/departments', params: { ror_id: '04t3en479' }
      expect(parsed_json_response).to eq(['IFG'])
    end
  end

  describe 'GET /api/v1/public/affiliations/groups' do
    before do
      Affiliation.create!(organization: 'KIT', department: 'IOC', group: 'Brause', country: 'Germany')
      Affiliation.create!(organization: 'KIT', department: 'ITC', group: 'Other', country: 'Germany')
    end

    it 'returns all groups when no params given' do
      get '/api/v1/public/affiliations/groups'
      expect(response).to have_http_status(:ok)
      expect(parsed_json_response).to include('Brause', 'Other')
    end

    it 'returns groups scoped by org and department' do
      get '/api/v1/public/affiliations/groups', params: { organization: 'KIT', department: 'IOC' }
      expect(parsed_json_response).to include('Brause')
      expect(parsed_json_response).not_to include('Other')
    end
  end

  describe 'POST /api/v1/affiliation_suggestions' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication) }
    let(:mail_double) { instance_double(ActionMailer::MessageDelivery, deliver_later: nil) }
    let(:mailer_double) { class_double(AffiliationMailer, suggestion_submitted: mail_double) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(user)
      stub_const('AffiliationMailer', mailer_double)
    end

    it 'creates a pending suggestion' do
      post '/api/v1/affiliation_suggestions', params: {
        organization: 'KIT', department: 'New Dept', country: 'Germany'
      }
      expect(response).to have_http_status(:created)
      expect(AffiliationSuggestion.last).to be_pending
      expect(AffiliationSuggestion.last.organization).to eq('KIT')
    end

    it 'creates a pending suggestion with only department (no organization)' do
      post '/api/v1/affiliation_suggestions', params: { department: 'New Dept' }
      expect(response).to have_http_status(:created)
      expect(AffiliationSuggestion.last.department).to eq('New Dept')
    end

    it 'creates a pending suggestion with a working group ("group" is a reserved SQL word)' do
      post '/api/v1/affiliation_suggestions', params: { organization: 'KIT', group: 'Levkin' }
      expect(response).to have_http_status(:created)
      expect(AffiliationSuggestion.last.group).to eq('Levkin')
    end

    it 'stores the ROR id on the suggestion' do
      post '/api/v1/affiliation_suggestions', params: { organization: 'KIT', group: 'Levkin', ror_id: '04t3en479' }
      expect(response).to have_http_status(:created)
      expect(AffiliationSuggestion.last.ror_id).to eq('04t3en479')
    end

    it 'stores the target user affiliation id when editing' do
      ua = UserAffiliation.create!(user: user, affiliation: Affiliation.create!(organization: 'KIT'))
      post '/api/v1/affiliation_suggestions', params: {
        organization: 'KIT', group: 'Levkin', target_user_affiliation_id: ua.id
      }
      expect(response).to have_http_status(:created)
      expect(AffiliationSuggestion.last.target_user_affiliation_id).to eq(ua.id)
    end
  end

  describe 'DELETE /api/v1/affiliation_suggestions/:id' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(user)
    end

    it 'withdraws the user own pending suggestion' do
      sugg = create(:affiliation_suggestion, user: user, organization: 'KIT', status: :pending)
      expect { delete "/api/v1/affiliation_suggestions/#{sugg.id}" }
        .to change(AffiliationSuggestion, :count).by(-1)
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'DELETE /api/v1/affiliations/:id' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication) }
    let(:affiliation) { Affiliation.create!(organization: 'KIT', department: 'IOC') }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(user)
    end

    it 'removes the orphaned affiliation once no user references it', :aggregate_failures do
      user_affiliation = UserAffiliation.create!(user: user, affiliation: affiliation)

      expect do
        delete "/api/v1/affiliations/#{user_affiliation.id}"
      end.to change(Affiliation, :count).by(-1)

      expect(response).to have_http_status(:ok)
      expect(Affiliation.find_by(id: affiliation.id)).to be_nil
    end

    it 'keeps the affiliation while another user still references it' do
      other_user = create(:person)
      user_affiliation = UserAffiliation.create!(user: user, affiliation: affiliation)
      UserAffiliation.create!(user: other_user, affiliation: affiliation)

      expect do
        delete "/api/v1/affiliations/#{user_affiliation.id}"
      end.not_to change(Affiliation, :count)
    end
  end

  describe 'create/update with blank department or group' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(user)
    end

    it 'accepts a create when department and group are sent blank', :aggregate_failures do
      post '/api/v1/affiliations', params: { organization: 'KIT', country: 'Germany', department: '', group: '' }
      expect(response).to have_http_status(:created)
      expect(user.reload.affiliations.last.organization).to eq('KIT')
    end

    it 'accepts an update with a blank department' do
      ua = UserAffiliation.create!(user: user, affiliation: Affiliation.create!(organization: 'KIT', department: 'IOC'))
      put '/api/v1/affiliations', params: { id: ua.id, organization: 'KIT', department: '' }
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'GET /api/v1/affiliation_suggestions' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(user)
      create(:affiliation_suggestion, user: user, organization: 'KIT', status: :pending)
      create(:affiliation_suggestion, user: user, organization: 'MIT', status: :approved)
    end

    it 'returns pending suggestions for current user' do
      get '/api/v1/affiliation_suggestions', params: { status: 'pending' }
      expect(response).to have_http_status(:ok)
      result = parsed_json_response
      expect(result.length).to eq(1)
      expect(result.first['organization']).to eq('KIT')
    end
  end
end
