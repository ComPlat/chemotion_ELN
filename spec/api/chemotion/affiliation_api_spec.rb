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
