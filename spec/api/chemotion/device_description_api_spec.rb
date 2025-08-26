# frozen_string_literal: true

describe Chemotion::DeviceDescriptionAPI do
  include_context 'api request authorization context'

  let(:user) { create(:user) }
  let(:collection) { create(:collection, user_id: user.id, devicedescription_detail_level: 10) }
  let(:device_description) do
    create(:device_description, :with_ontologies, collection_id: collection.id, created_by: collection.user_id)
  end
  let(:device_description2) do
    create(:device_description, :with_ontologies, collection_id: collection.id, created_by: collection.user_id)
  end
  let(:device_description_collection) do
    create(:collections_device_description, device_description: device_description, collection: collection)
  end
  let(:element_klass) { create(:element_klass, :for_device_descriptions) }
  let(:segment_klass) { create(:segment_klass, :with_ontology_properties_template, element_klass: element_klass) }

  describe 'GET /api/v1/device_descriptions/' do
    before do
      CollectionsDeviceDescription.create!(device_description: device_description, collection: collection)
    end

    let(:params) do
      { collection_id: collection.id }
    end

    it 'fetches device descriptions by collection id' do
      get '/api/v1/device_descriptions/', params: params

      expect(parsed_json_response['device_descriptions'].size).to be(1)
    end
  end

  describe 'POST /api/v1/device_descriptions' do
    let(:device_description_params) { attributes_for(:device_description, collection_id: collection.id) }

    context 'when creating a device description' do
      it 'returns a device description' do
        post '/api/v1/device_descriptions', params: device_description_params

        expect(parsed_json_response['device_description']['short_label']).to include('Dev')
      end

      it 'has taggable_data' do
        post '/api/v1/device_descriptions', params: device_description_params

        expect(parsed_json_response['device_description']['tag']['taggable_data'].size).to be(1)
      end
    end
  end

  describe 'GET /api/v1/device_descriptions/:id' do
    before do
      device_description
    end

    it 'fetches an device description by id' do
      get "/api/v1/device_descriptions/#{device_description.id}"

      expect(parsed_json_response['device_description']['name']).to eql(device_description.name)
    end
  end

  describe 'GET /api/v1/device_descriptions/ontologies' do
    before do
      segment_klass
    end

    context 'when getting ontologies of segments' do
      it 'returns ontology' do
        get '/api/v1/device_descriptions/ontologies'

        expect(parsed_json_response.size).to be(2)
      end
    end
  end

  describe 'POST /api/v1/device_descriptions/ui_state/' do
    before do
      device_description_collection
    end

    let(:params) do
      {
        ui_state: {
          all: false,
          included_ids: [device_description.id, device_description2.id],
          excluded_ids: [],
          collection_id: collection.id,
        },
        limit: 1,
      }
    end

    it 'fetches only one device description' do
      post '/api/v1/device_descriptions/ui_state/', params: params, as: :json

      expect(parsed_json_response['device_descriptions'].size).to be(1)
    end
  end

  describe 'POST /api/v1/device_descriptions/sub_device_descriptions/' do
    before do
      device_description_collection
    end

    let(:params) do
      {
        ui_state: {
          currentCollectionId: collection.id,
          device_description: {
            all: false,
            included_ids: [device_description.id],
            excluded_ids: [],
          },
        },
      }
    end

    it 'creates a split of selected device description' do
      post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json

      expect(device_description.reload.children.size).to be(1)
    end
  end

  describe 'PUT /api/v1/device_descriptions/:id' do
    context 'when updating an device description' do
      let(:params) do
        {
          name: 'new name',
          short_label: 'CU1-DD1-2',
        }
      end

      it 'returns the updated device description' do
        put "/api/v1/device_descriptions/#{device_description.id}", params: device_description.attributes.merge(params)

        expect(parsed_json_response['device_description']).to include(params.stringify_keys)
      end
    end
  end

  describe 'DELETE /api/v1/device_descriptions/:id' do
    it 'deletes a device description' do
      delete "/api/v1/device_descriptions/#{device_description.id}"

      expect(parsed_json_response).to include('deleted' => device_description.id)
    end
  end
end
