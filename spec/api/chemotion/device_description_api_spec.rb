# frozen_string_literal: true

describe Chemotion::DeviceDescriptionAPI do
  include_context 'api request authorization context'

  let(:user) { create(:user) }
  let(:collection) { create(:collection, user_id: user.id, devicedescription_detail_level: 10) }
  let(:device_description) { create(:device_description, collection_id: collection.id, created_by: collection.user_id) }

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
    let(:device_description_params) { attributes_for(:device_description) }

    it 'creates a device description' do
      post '/api/v1/device_descriptions', params: device_description_params

      expect(parsed_json_response['device_description']['short_label']).to include('Dev')
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
