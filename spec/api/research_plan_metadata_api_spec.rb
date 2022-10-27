# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ResearchPlanMetadataAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/research_plan_metadata/:id' do
      context 'with appropriate permissions' do
        let!(:c) { create(:collection, user_id: user.id) }
        let(:research_plan) { create(:research_plan) }
        let(:research_plan_metadata) { create(:research_plan_metadata, research_plan: research_plan) }

        before do
          research_plan.research_plan_metadata = research_plan_metadata
          research_plan.save

          get "/api/v1/research_plan_metadata/#{research_plan.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns serialized research_plan_metadata' do
          expect(JSON.parse(response.body)['research_plan_metadata']['title']).to eq research_plan_metadata.title
        end
      end
    end

    describe 'POST /api/v1/research_plan_metadata' do
      let(:research_plan) { create(:research_plan) }

      let(:params) do
        {
          research_plan_id: research_plan.id,
          title: 'Metadata',
          subject: 'a subject',
          version: '08.15',
          type: 'Test-Type',
          description: {
            description: 'Metadata for research plan',
            descriptionType: 'Other'
          },
          geo_location: {
            geoLocationPoint: {
              pointLongitude: Faker::Address.longitude.to_s,
              pointLatitude: Faker::Address.latitude.to_s
            }
          },
          funding_reference: {
            funderName: Faker::Name.name,
            funderIdentifier: Faker::Internet.url
          }
        }
      end

      describe 'when updating research plan metadata' do
        before do
          research_plan

          post '/api/v1/research_plan_metadata', params: params
        end

        it 'Creates research plan metadata' do
          expect(research_plan.research_plan_metadata).to have_attributes(params.deep_stringify_keys)
        end
      end
    end
  end
end
