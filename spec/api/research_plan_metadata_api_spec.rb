# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ResearchPlanMetadataAPI do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user) # rubocop:disable RSpec/AnyInstance
  end

  describe 'GET /api/v1/research_plan_metadata/:id' do
    let(:research_plan) { create(:research_plan, collections: [collection]) }
    let!(:research_plan_metadata) do
      create(:research_plan_metadata, research_plan: research_plan)
    end

    context 'with read permissions' do
      before do
        get "/api/v1/research_plan_metadata/#{research_plan.id}"
      end

      it 'returns 200 status code' do
        expect(response).to have_http_status :ok
      end

      it 'returns serialized research_plan_metadata' do
        expect(JSON.parse(response.body)['research_plan_metadata']['title']).to eq research_plan_metadata.title
      end
    end

    context 'when the research plan is in a read-only shared collection' do
      let(:collection) do
        create(:collection, user: other_user).tap do |c|
          create(
            :collection_share,
            collection: c,
            shared_with: user,
            permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements],
          )
        end
      end

      before do
        get "/api/v1/research_plan_metadata/#{research_plan.id}"
      end

      it 'returns 200 status code' do
        expect(response).to have_http_status :ok
      end

      it 'returns serialized research_plan_metadata' do
        expect(JSON.parse(response.body)['research_plan_metadata']['title']).to eq research_plan_metadata.title
      end
    end

    context 'without read permissions' do
      let(:collection) { create(:collection, user: other_user) }

      before do
        get "/api/v1/research_plan_metadata/#{research_plan.id}"
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status :unauthorized
      end
    end

    context 'when the research plan does not exist' do
      before do
        get '/api/v1/research_plan_metadata/0'
      end

      it 'returns 404 not found' do
        expect(response).to have_http_status :not_found
      end
    end
  end

  describe 'POST /api/v1/research_plan_metadata' do
    let(:research_plan) { create(:research_plan, collections: [collection]) }

    let(:params) do
      {
        research_plan_id: research_plan.id,
        title: 'Metadata',
        subject: 'a subject',
        version: '08.15',
        type: 'Test-Type',
        description: {
          description: 'Metadata for research plan',
          descriptionType: 'Other',
        },
        geo_location: {
          geoLocationPoint: {
            pointLongitude: Faker::Address.longitude.to_s,
            pointLatitude: Faker::Address.latitude.to_s,
          },
        },
        funding_reference: {
          funderName: Faker::Name.name,
          funderIdentifier: Faker::Internet.url,
        },
      }
    end

    context 'when the user can update the research plan' do
      before do
        post '/api/v1/research_plan_metadata', params: params
      end

      it 'creates research plan metadata' do
        expect(research_plan.reload.research_plan_metadata).to have_attributes(params.deep_stringify_keys)
      end
    end

    context 'when the research plan is in a read-only shared collection' do
      let(:collection) do
        create(:collection, user: other_user).tap do |c|
          create(
            :collection_share,
            collection: c,
            shared_with: user,
            permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements],
          )
        end
      end

      before do
        post '/api/v1/research_plan_metadata', params: params
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status :unauthorized
      end

      it 'does not create research plan metadata' do
        expect(research_plan.reload.research_plan_metadata).to be_nil
      end
    end

    context 'without update permissions' do
      let(:collection) { create(:collection, user: other_user) }

      before do
        post '/api/v1/research_plan_metadata', params: params
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status :unauthorized
      end
    end

    context 'when the research plan does not exist' do
      before do
        post '/api/v1/research_plan_metadata', params: params.merge(research_plan_id: 0)
      end

      it 'returns 404 not found' do
        expect(response).to have_http_status :not_found
      end
    end
  end
end
