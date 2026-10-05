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

    it 'also lists departments of a legacy row with the same name and no ROR id yet' do
      Affiliation.create!(organization: 'Karlsruhe Institute of Technology', department: 'IOC')
      get '/api/v1/public/affiliations/departments',
          params: { ror_id: '04t3en479', organization: 'Karlsruhe Institute of Technology' }
      expect(parsed_json_response).to eq(['IOC'])
    end
  end

  describe 'GET /api/v1/public/affiliations/ror_search' do
    let(:ror_payload) do
      {
        items: [
          {
            id: 'https://ror.org/04t3en479',
            names: [
              { value: 'KIT', types: ['acronym'] },
              { value: 'Karlsruhe Institute of Technology', types: %w[ror_display label] },
            ],
            locations: [{ geonames_details: { country_name: 'Germany' } }],
          },
        ],
      }.to_json
    end

    it 'maps ROR v2 items to ror_id, display name and country', :aggregate_failures do
      ror_response = instance_double(HTTParty::Response, success?: true, body: ror_payload)
      allow(HTTParty).to receive(:get).and_return(ror_response)

      get '/api/v1/public/affiliations/ror_search', params: { q: 'Karlsruhe' }

      expect(response).to have_http_status(:ok)
      result = parsed_json_response.first
      expect(result['ror_id']).to eq('04t3en479')
      expect(result['name']).to eq('Karlsruhe Institute of Technology')
      expect(result['country']).to eq('Germany')
    end

    it 'returns an empty list when the ROR API fails' do
      allow(HTTParty).to receive(:get).and_raise(Net::OpenTimeout)

      get '/api/v1/public/affiliations/ror_search', params: { q: 'Karlsruhe' }

      expect(parsed_json_response).to eq([])
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

    it 'refuses a suggestion without an organization' do
      expect do
        post '/api/v1/affiliation_suggestions', params: { department: 'New Dept' }
      end.not_to change(AffiliationSuggestion, :count)
      expect(response).to have_http_status(422)
    end

    it 'creates a pending suggestion with a working group ("group" is a reserved SQL word)' do
      post '/api/v1/affiliation_suggestions', params: { organization: 'KIT', group: 'Levkin' }
      expect(response).to have_http_status(:created)
      expect(AffiliationSuggestion.last.group).to eq('Levkin')
    end

    it 'rejects an accent variant of an existing registry entry' do
      Affiliation.create!(organization: 'ETH Zürich')
      post '/api/v1/affiliation_suggestions', params: { organization: 'ETH Zurich' }
      expect(response).to have_http_status(422)
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
      Affiliation.create!(organization: 'KIT', department: 'IOC', country: 'Germany')
    end

    it 'accepts a create when department and group are sent blank', :aggregate_failures do
      post '/api/v1/affiliations', params: { organization: 'KIT', country: 'Germany', department: '', group: '' }
      expect(response).to have_http_status(:created)
      expect(user.reload.affiliations.last.organization).to eq('KIT')
    end

    it 'accepts blank from/to date strings' do
      post '/api/v1/affiliations', params: { organization: 'KIT', from: '', to: '' }
      expect(response).to have_http_status(:created)
    end

    it 'reuses the existing organization row for a case variant', :aggregate_failures do
      Affiliation.create!(organization: 'KIT')
      expect do
        post '/api/v1/affiliations', params: { organization: 'kit' }
      end.not_to change(Affiliation, :count)
      expect(user.reload.affiliations.last.organization).to eq('KIT')
    end

    it 'accepts an update with a blank department', :aggregate_failures do
      ua = UserAffiliation.create!(user: user, affiliation: Affiliation.create!(organization: 'KIT', department: 'IOC'))
      put '/api/v1/affiliations', params: { id: ua.id, organization: 'KIT', department: '' }
      expect(response).to have_http_status(:ok)
      expect(ua.reload.affiliation.department).to be_nil
    end

    it 'rejects a duplicate affiliation and notifies the user', :aggregate_failures do
      details = { organization: 'KIT', department: 'IOC', country: 'Germany' }
      post '/api/v1/affiliations', params: details
      expect do
        post '/api/v1/affiliations', params: details
      end.not_to change(user.user_affiliations, :count)
      expect(response).to have_http_status(422)
      expect(parsed_json_response['error']).to eq('You already have this affiliation.')
    end
  end

  describe 'direct create/update only links registry values' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(user)
      Affiliation.create!(organization: 'KIT', department: 'IOC', group: 'Bräse', country: 'Germany')
    end

    it 'refuses an unknown organization', :aggregate_failures do
      expect do
        post '/api/v1/affiliations', params: { organization: 'Fake Org', department: 'X' }
      end.not_to change(Affiliation, :count)
      expect(response).to have_http_status(422)
      expect(parsed_json_response['error']).to include('suggest it instead')
    end

    it 'refuses an unknown department of a known organization' do
      post '/api/v1/affiliations', params: { organization: 'KIT', department: 'Typo Dept' }
      expect(response).to have_http_status(422)
    end

    it 'files a suggestion for a known organization in a new country', :aggregate_failures do
      expect do
        post '/api/v1/affiliations', params: { organization: 'KIT', country: 'France' }
      end.not_to change(Affiliation, :count)
      expect(response).to have_http_status(:accepted)
      expect(AffiliationSuggestion.last).to have_attributes(organization: 'KIT', country: 'France', user_id: user.id)
    end

    it 'files an edit suggestion targeting the row when the country changes', :aggregate_failures do
      ua = UserAffiliation.create!(user: user, affiliation: Affiliation.first)
      put '/api/v1/affiliations', params: { id: ua.id, organization: 'KIT', department: 'IOC', country: 'France' }
      expect(response).to have_http_status(:accepted)
      expect(AffiliationSuggestion.last.target_user_affiliation_id).to eq(ua.id)
      expect(ua.reload.affiliation.country).to eq('Germany')
    end

    it 'links a known combination, matching case and accents', :aggregate_failures do
      post '/api/v1/affiliations',
           params: { organization: 'kit', department: 'ioc', group: 'Brase', country: 'Germany' }
      expect(response).to have_http_status(:created)
      expect(user.reload.affiliations.last.group).to eq('Bräse')
    end

    it 'refuses an update to an unknown department and keeps the row', :aggregate_failures do
      ua = UserAffiliation.create!(user: user, affiliation: Affiliation.first)
      put '/api/v1/affiliations', params: { id: ua.id, organization: 'KIT', department: 'Typo Dept' }
      expect(response).to have_http_status(422)
      expect(ua.reload.affiliation.department).to eq('IOC')
    end

    it 'refuses a malformed ROR id without calling ROR' do
      allow(Chemotion::RorService).to receive(:find)
      post '/api/v1/affiliations', params: { organization: 'Fake Org', ror_id: '../../x' }
      expect(response).to have_http_status(422)
      expect(Chemotion::RorService).not_to have_received(:find)
    end

    it 'takes name and country from ROR for a new ROR pick, not from the request', :aggregate_failures do
      allow(Chemotion::RorService).to receive(:find).with('02jz4aj89')
                                                    .and_return({ ror_id: '02jz4aj89', name: 'Maastricht University',
                                                                  country: 'Netherlands' })
      post '/api/v1/affiliations', params: { organization: 'Fake Org', country: 'France', ror_id: '02jz4aj89' }
      expect(response).to have_http_status(:created)
      expect(Affiliation.find_by(ror_id: '02jz4aj89')).to have_attributes(organization: 'Maastricht University',
                                                                          country: 'Netherlands')
    end

    it 'refuses a ROR id that ROR does not know' do
      allow(Chemotion::RorService).to receive(:find).and_return(nil)
      post '/api/v1/affiliations', params: { organization: 'Fake Org', ror_id: '0abcdef12' }
      expect(response).to have_http_status(422)
    end

    it 'links a ROR pick to the legacy row instead of creating a duplicate', :aggregate_failures do
      legacy = Affiliation.create!(organization: 'Karlsruhe Institute of Technology', department: 'ITC',
                                   country: 'Germany')
      allow(Chemotion::RorService).to receive(:find)
        .and_return({ ror_id: '04t3en479', name: 'Karlsruhe Institute of Technology', country: 'Germany' })
      expect do
        post '/api/v1/affiliations', params: { organization: 'Karlsruhe Institute of Technology',
                                               ror_id: '04t3en479', department: 'ITC', country: 'Germany' }
      end.not_to change(Affiliation, :count)
      expect(response).to have_http_status(:created)
      expect(user.reload.affiliations).to eq([legacy])
    end

    it 'reuses the ROR-tagged row when the organization is picked by name', :aggregate_failures do
      tagged = Affiliation.create!(organization: 'Karlsruhe Institute of Technology', department: 'IBCS',
                                   country: 'Germany', ror_id: '04t3en479')
      expect do
        post '/api/v1/affiliations', params: { organization: 'Karlsruhe Institute of Technology',
                                               department: 'IBCS', country: 'Germany' }
      end.not_to change(Affiliation, :count)
      expect(user.reload.affiliations).to eq([tagged])
    end

    it 'says to try again later when ROR is down', :aggregate_failures do
      allow(Chemotion::RorService).to receive(:find).and_raise(Chemotion::RorService::Unavailable)
      post '/api/v1/affiliations', params: { organization: 'x', ror_id: '02jz4aj89' }
      expect(response).to have_http_status(503)
      expect(parsed_json_response['error']).to include('try again later')
    end

    it 'refuses a department under a new ROR organization' do
      allow(Chemotion::RorService).to receive(:find)
        .and_return({ ror_id: '02jz4aj89', name: 'Maastricht University', country: 'Netherlands' })
      post '/api/v1/affiliations', params: { organization: 'x', ror_id: '02jz4aj89', department: 'New Dept' }
      expect(response).to have_http_status(422)
    end
  end

  describe 'from/to dates on a user affiliation' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(user)
      Affiliation.create!(organization: 'KIT')
      Affiliation.create!(organization: 'MIT')
    end

    it 'stores from and to on the link, not on the shared affiliation', :aggregate_failures do
      post '/api/v1/affiliations', params: { organization: 'KIT', from: '2020-01-01', to: '2022-12-31' }
      ua = user.user_affiliations.last
      expect(ua.from).to eq(Date.new(2020, 1, 1))
      expect(ua.to).to eq(Date.new(2022, 12, 31))
      expect(ua.affiliation.from).to be_nil
    end

    it 'rejects editing one affiliation into another the user already has', :aggregate_failures do
      post '/api/v1/affiliations', params: { organization: 'KIT' }
      post '/api/v1/affiliations', params: { organization: 'MIT' }
      mit = user.user_affiliations.find_by(affiliation: Affiliation.find_by(organization: 'MIT'))
      put '/api/v1/affiliations', params: { id: mit.id, organization: 'KIT' }
      expect(response).to have_http_status(422)
      expect(parsed_json_response['error']).to eq('You already have this affiliation.')
    end

    it 'updates the dates without splitting the affiliation row', :aggregate_failures do
      post '/api/v1/affiliations', params: { organization: 'KIT', from: '2020-01-01' }
      ua = user.user_affiliations.last
      expect do
        put '/api/v1/affiliations', params: { id: ua.id, organization: 'KIT', to: '2024-06-30' }
      end.not_to change(Affiliation, :count)
      expect(ua.reload.to).to eq(Date.new(2024, 6, 30))
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
