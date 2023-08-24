# frozen_string_literal: true

# rubocop: disable RSpec/MultipleExpectations
# rubocop: disable Layout/LineLength

require 'rails_helper'

describe Chemotion::VesselAPI do
  include_context 'api request authorization context'

  describe 'GET /api/v1/vessels/' do
    let(:vessel) { create(:vessel) }
    let(:user) { create(:user) }
    let(:collection) { create(:collection) }

    context 'when vessel exists' do
      before do
        CollectionsVessel.create(collection: collection, vessel: vessel)
        user.collections << collection
        user.save

        get "/api/v1/vessels/#{vessel.id}"
      end

      it 'return correct status (http 200)' do
        expect(response).to have_http_status :ok
      end

      it 'returns correct vessel' do
        expect(parsed_json_response['name']).to eq 'Vessel 1'
      end
    end

    context 'when vessel does not exist' do
      before do
        get '/api/v1/vessels/-1'
      end

      it 'returns correct status (http 400)' do
        expect(response).to have_http_status :bad_request
      end

      it 'correct error message' do
        expect(parsed_json_response['error']).to eq 'id is not valid'
      end
    end
  end

  describe 'POST /api/v1/vessels/' do
    context 'with correct parameters' do
      let(:collection) { Collection.first }
      let(:params) do
        {
          collection_id: collection.id,
          template_name: 'Vessel Template 1',
          details: 'multi-neck',
          vessel_type: 'round bottom flask',
          volume_unit: 'ml',
          volume_amount: 500,
          material_type: 'glass',
          material_details: 'other material details',
        }
      end

      before do
        post '/api/v1/vessels/', params: params, as: :json
      end

      it 'returns correct status (http 201)' do
        expect(response).to have_http_status :created
      end

      it 'returns correct representation of saved vessel' do
        expect(parsed_json_response['name']).to be_nil
        expect(parsed_json_response['description']).to be_nil
        expect(parsed_json_response['vessel_template']['name']).to eq 'Vessel Template 1'
        expect(parsed_json_response['vessel_template']['details']).to eq 'multi-neck'
        expect(parsed_json_response['vessel_template']['vessel_type']).to eq 'round bottom flask'
        expect(parsed_json_response['vessel_template']['volume_unit']).to eq 'ml'
        expect(parsed_json_response['vessel_template']['volume_amount']).to eq 500
        expect(parsed_json_response['vessel_template']['material_type']).to eq 'glass'
        expect(parsed_json_response['vessel_template']['material_details']).to eq 'other material details'
      end
    end

    context 'with incorrect parameters (missing volume or material information)' do
      let(:collection) { Collection.first }
      let(:params) do
        {
          collection_id: collection.id,
          template_name: 'Vessel Template 1',
          vessel_type: 'round bottom flask',
        }
      end

      before do
        post '/api/v1/vessels/', params: params, as: :json
      end

      it 'correct error messages' do
        expect(parsed_json_response['error']).to eq 'volume_unit is missing, volume_amount is missing, material_type is missing'
      end

      it 'returns correct status (http 400)' do
        expect(response).to have_http_status :bad_request
      end
    end
  end

  describe 'DELETE /api/v1/vessels' do
    context 'with correct parameters' do
      let(:vessel) { create(:vessel) }
      let(:collection) { create(:collection) }

      let(:params) do
        {
          name: 'test',
          template_name: 'Vessel Template 1',
          details: 'multi-neck',
          vessel_type: 'round bottom flask',
          volume_unit: 'ml',
          volume_amount: 500,
          material_type: 'glass',
          material_details: 'other material details',
        }
      end

      before do
        CollectionsVessel.create(collection: collection, vessel: vessel)
        delete "/api/v1/vessels/#{vessel.id}"
      end

      it 'is able to delete vessel' do
        v = Vessel.find_by(name: 'test')
        expect(v).to be_nil
      end
    end
  end

  describe 'PUT /api/v1/vessels' do
    context 'when updating name with correct parameters' do
      let(:vessel) { create(:vessel) }
      let(:user) { create(:user) }
      let(:collection) { create(:collection) }

      let(:params) do
        {
          vessel_id: vessel.id,
          template_name: 'Vessel Template 1',
          details: 'multi-neck',
          vessel_type: 'round bottom flask',
          volume_unit: 'ml',
          volume_amount: 500,
          material_type: 'glass',
          material_details: 'other material details',
          name: 'update test name',
        }
      end

      before do
        CollectionsVessel.create(collection: collection, vessel: vessel)
        user.collections << collection
        user.save

        put '/api/v1/vessels/', params: params
      end

      it 'is able to update vessel name' do
        expect(parsed_json_response['name']).to eq('update test name')
      end
    end
  end
end

# rubocop: enable RSpec/MultipleExpectations
# rubocop: enable Layout/LineLength
