# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers
describe Chemotion::ScreenAPI do
  include_context 'api request authorization context'

  let(:request_headers) do
    {
      'CONTENT-TYPE' => 'application/json',
    }
  end
  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:another_collection) { create(:collection, user_id: user.id) }
  let(:other_user_collection) { create(:collection, user_id: other_user.id) }
  let(:other_shared_collection) do
    create(:collection, user_id: other_user.id).tap do |collection|
      create(
        :collection_share,
        collection: collection,
        shared_with: user,
        permission_level: CollectionShare.permission_level(:remove_elements),
      )
    end
  end

  let(:screen) do
    create(
      :screen,
      collections: [collection],
      component_graph_data: { some_dummy: 'data', with_nested: { but_cool: 'Stuff' } },
    )
  end
  let(:another_screen) { create(:screen, collections: [collection]) }

  describe 'GET /api/v1/screens' do
    context 'when no error occurs' do
      before do
        screen
        another_screen
      end

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
        screen
        another_screen

        get '/api/v1/screens', params: params, headers: request_headers
        expect(JSON.parse(response.body)['screens'].size).to eq(2)
      end

      context 'when no screens found' do
        let(:empty_collection) { create(:collection, user: user, label: 'empty collection') }
        let(:collection) { empty_collection }

        it 'returns no screens' do
          get '/api/v1/screens', params: params, headers: request_headers
          expect(JSON.parse(response.body)['screens'].size).to eq(0)
        end
      end
    end
  end

  describe 'GET /api/v1/screens/{id}' do
    before do
      get "/api/v1/screens/#{screen.id}", headers: request_headers
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns the right screen' do
      expect(JSON.parse(response.body)['screen']['name']).to eq(screen.name)
    end

    it 'returns can_update as true for the owner' do
      expect(JSON.parse(response.body)['screen']['can_update']).to be true
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

    context 'when the screen is in a read-only shared collection' do
      let(:collection) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements])
        end
      end

      it 'returns can_update as false' do
        expect(response).to have_http_status :ok
        expect(JSON.parse(response.body)['screen']['can_update']).to be false
      end
    end

    context 'when the screen is in a writable shared collection' do
      let(:collection) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare::PERMISSION_LEVELS[:edit_elements])
        end
      end

      it 'returns can_update as true' do
        expect(response).to have_http_status :ok
        expect(JSON.parse(response.body)['screen']['can_update']).to be true
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
    let(:screen) { create(:screen, name: 'Testname', container: container, collections: [collection]) }
    let(:wellplate) { create(:wellplate, collections: [collection]) }
    let(:other_wellplate) { create(:wellplate, collections: [collection]) }
    let(:research_plan) { create(:research_plan, collections: [collection]) }
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

    context 'when the user can update the screen' do
      before do
        ScreensWellplate.create!(wellplate: other_wellplate, screen: screen)
        put "/api/v1/screens/#{screen.id}", params: params.to_json, headers: request_headers
      end

      it 'is able to change a screen by id' do
        expect(parsed_json_response['screen']['name']).to eq('Another Testname')
        # rubocop:disable Rails/Pluck -- wellplates/research_plans are parsed JSON (Array of Hash), not AR relations
        expect(
          parsed_json_response['screen']['wellplates'].map { |w| w['id'] },
        ).to eq([wellplate.id])
        expect(
          parsed_json_response['screen']['research_plans'].map { |r| r['id'] },
        ).to eq([research_plan.id])
        # rubocop:enable Rails/Pluck
      end

      it 'updates the component_graph_data correctly' do
        expect(parsed_json_response['screen']['component_graph_data']).to eq(
          {
            'nodes' => [{ 'id' => 1337 }],
            'edges' => [],
          },
        )
      end

      it 'returns can_update as true after a successful update' do
        expect(parsed_json_response['screen']['can_update']).to be true
      end
    end

    context 'when the screen is in a read-only shared collection' do
      let(:collection) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements])
        end
      end

      before do
        put "/api/v1/screens/#{screen.id}", params: params.to_json, headers: request_headers
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status :unauthorized
      end

      it 'does not update the screen' do
        expect(screen.reload.name).to eq('Testname')
      end
    end
  end

  describe 'POST /api/v1/screens' do
    let(:container) { create(:container) }
    let(:wellplate) { create(:wellplate, collections: [collection]) }
    let(:research_plan) { create(:research_plan, collections: [collection]) }
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
      expect(parsed_json_response['screen']['component_graph_data']).to eq(
        {
          'nodes' => [{ 'id' => 1337 }],
          'edges' => [],
        },
      )
    end

    context 'when collection_id points to a read-only shared collection' do
      let(:read_only_collection) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements])
        end
      end
      let(:params) do
        {
          name: 'Forbidden Screen',
          collection_id: read_only_collection.id,
          container: { id: container.id },
          wellplate_ids: [],
          research_plan_ids: [],
        }.to_json
      end

      before { post '/api/v1/screens', params: params, headers: request_headers }

      it 'returns 403 forbidden' do
        expect(response).to have_http_status :forbidden
      end

      it 'does not create the screen' do
        expect(Screen.find_by(name: 'Forbidden Screen')).to be_nil
      end
    end

    context 'when collection_id points to a writable shared collection' do
      let(:writable_collection) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare::PERMISSION_LEVELS[:add_elements])
        end
      end
      let(:params) do
        {
          name: 'Shared Write Screen',
          collection_id: writable_collection.id,
          container: { id: container.id },
          wellplate_ids: [],
          research_plan_ids: [],
        }.to_json
      end

      before { post '/api/v1/screens', params: params, headers: request_headers }

      it 'returns 201 created' do
        expect(response).to have_http_status :created
      end

      it 'creates the screen in the shared collection' do
        screen = Screen.find_by(name: 'Shared Write Screen')
        expect(screen).not_to be_nil
        expect(screen.collections).to include(writable_collection)
      end
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
