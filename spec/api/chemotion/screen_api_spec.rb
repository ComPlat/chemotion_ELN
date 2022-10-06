# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ScreenAPI do
  include_context 'api request authorization context'

  let(:request_headers) do
    {
      'CONTENT-TYPE' => 'application/json',
    }
  end
  let(:other_user) { create(:person) }
  let(:collection) do
    create(
      :collection,
      user_id: user.id,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 10,
      screen_detail_level: 10
    )
  end
  let(:another_collection) { create(:collection, user_id: user.id) }
  let(:other_user_collection) { create(:collection, user_id: other_user.id) }
  let(:other_shared_collection) { create(:collection, user_id: other_user.id, is_shared: true, permission_level: 3) }

  let(:screen) { create(:screen, component_graph_data: { some_dummy: 'data', with_nested: { but_cool: 'Stuff' } }) }
  let(:another_screen) { create(:screen) }

  describe 'GET /api/v1/screens' do
    before do
      CollectionsScreen.create!(screen: screen, collection: collection)
      CollectionsScreen.create!(screen: another_screen, collection: collection)
    end

    context 'when no error occurs' do
      it 'returns a list of screens' do
        get '/api/v1/screens', headers: request_headers
        expect(parsed_json_response['screens'].length).to eq(2)
      end
    end

    context 'when collection_id is given' do
      let(:params) do
        { collection_id: collection.id }
      end

      it 'returns screens' do
        get '/api/v1/screens', params: params, headers: request_headers
        expect(JSON.parse(response.body)['screens'].size).to eq(2)
      end

      context 'when no screens found' do
        it 'returns no screens' do
          allow(Collection).to receive(:belongs_to_current_user).and_raise(ActiveRecord::RecordNotFound)
          get '/api/v1/screens', params: params, headers: request_headers
          expect(JSON.parse(response.body)['screens'].size).to eq(0)
        end
      end
    end

    context 'when sync_collection_id is given' do
      let(:sharer) { create(:person) }
      let(:sync_collections_user) do
        create(:sync_collections_user, collection: collection, user: user, sharer: sharer)
      end
      let(:params) do
        { sync_collection_id: sync_collections_user.id }
      end

      it 'returns screens' do
        get '/api/v1/screens', params: params, headers: request_headers
        expect(JSON.parse(response.body)['screens'].size).to eq(2)
      end

      context 'when no screens found' do
        let(:params) do
          { sync_collection_id: sync_collections_user.id + 1 }
        end

        it 'returns no screens' do
          get '/api/v1/screens', params: params, headers: request_headers
          expect(JSON.parse(response.body)['screens'].size).to eq(0)
        end
      end
    end
  end

  describe 'GET /api/v1/screens/{id}' do
    before do
      CollectionsScreen.create!(screen: screen, collection: collection)

      get "/api/v1/screens/#{screen.id}", headers: request_headers
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns the right screen' do
      expect(JSON.parse(response.body)['screen']['name']).to eq(screen.name)
    end

    it 'returns the component_graph_data as json object' do
      expect(JSON.parse(response.body)['screen']['component_graph_data']).to eq(
        { some_dummy: 'data', with_nested: { but_cool: 'Stuff' } }.deep_stringify_keys,
      )
    end

    context 'when permissions are inappropriate' do
      let(:collection) { other_user_collection }

      it 'returns 401 unauthorized status code' do
        expect(response.status).to eq 401
      end
    end
  end

  describe 'POST /api/v1/screens/:id/add_research_plan' do
    let(:request_body) do
      {
        collection_id: collection.id
      }
    end
    let(:expected_response) do
      Entities::ScreenEntity.represent(screen, root: :screen)
    end

    before do
      CollectionsScreen.create!(screen: screen, collection: collection)
    end

    it 'adds an empty research plan to the screen' do
      expect do
        post "/api/v1/screens/#{screen.id}/add_research_plan", params: request_body
      end.to change(screen.research_plans, :count).by(1)
    end

    it 'returns the serialized screen' do
      post "/api/v1/screens/#{screen.id}/add_research_plan", params: request_body

      expect(response.status).to eq 201
      body_value = JSON.parse(response.body)
      expected_response.instance_variables.each do |ivar_name|
        expect(body_value[ivar_name]).to eq(expected_response.instance_variable_get ivar_name)
      end
    end
  end

  describe 'PUT /api/v1/screens/{id}' do
    let(:container) { create(:container) }
    let(:screen) { create(:screen, name: 'Testname', container: container) }
    let(:wellplate) { create(:wellplate) }
    let(:other_wellplate) { create(:wellplate) }
    let(:research_plan) { create(:research_plan) }
    let(:params) do
      {
        id: screen.id,
        name: 'Another Testname',
        container: { id: container.id },
        wellplate_ids: [wellplate.id],
        research_plan_ids: [research_plan.id],
        component_graph_data: {
          nodes: [{ id: 1337 }],
          edges: [],
        },
      }
    end

    before do
      CollectionsScreen.create!(screen: screen, collection: collection)
      CollectionsResearchPlan.create(research_plan: research_plan, collection: collection)
      ScreensWellplate.create!(wellplate: other_wellplate, screen: screen)
      put "/api/v1/screens/#{screen.id}", params: params.to_json, headers: request_headers
    end

    it 'is able to change a screen by id' do
      expect(parsed_json_response['screen']['name']).to eq('Another Testname')
      expect(
        parsed_json_response['screen']['wellplates'].map { |w| w['id'] }
      ).to eq([wellplate.id])
      expect(
        parsed_json_response['screen']['research_plans'].map { |r| r['id'] }
      ).to eq([research_plan.id])
    end

    it 'updates the component_graph_data correctly' do
      expect(parsed_json_response['screen']['component_graph_data']).to eq(
        {
          'nodes' => [{ 'id' => 1337 }],
          'edges' => [],
        },
      )
    end
  end

  describe 'POST /api/v1/screens' do
    let(:container) { create(:container) }
    let(:screen) { create(:screen, name: 'Testname', container: container) }
    let(:wellplate) { create(:wellplate) }
    let(:other_wellplate) { create(:wellplate) }
    let(:research_plan) { create(:research_plan) }
    let(:params) do
      {
        name: 'New Screen Testname',
        collection_id: collection.id,
        container: { id: container.id },
        wellplate_ids: [wellplate.id],
        research_plan_ids: [research_plan.id],
        component_graph_data: {
          nodes: [{ id: 1337 }],
          edges: [],
        },
      }
    end

    before do
      post '/api/v1/screens', params: params.to_json, headers: request_headers
    end

    it 'creates a new screen' do
      expect(parsed_json_response['screen']['name']).to eq(params[:name])
      expect(
        parsed_json_response['screen']['wellplates'].map { |w| w['id'] }
      ).to eq([wellplate.id])
      expect(
        parsed_json_response['screen']['research_plans'].map { |r| r['id'] }
      ).to eq([research_plan.id])
    end

    it 'writes the component_graph_data correctly' do
      puts parsed_json_response
      expect(parsed_json_response['screen']['component_graph_data']).to eq(
        {
          'nodes' => [{ 'id' => 1337 }],
          'edges' => [],
        },
      )
    end

    context 'when collection_id is a sync_collection_user.id' do
      pending 'TODO: Add missing spec'
    end
  end
end
