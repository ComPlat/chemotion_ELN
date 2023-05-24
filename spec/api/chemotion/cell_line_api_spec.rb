# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::CellLineAPI do
  include_context 'api request authorization context'

  describe 'GET /api/v1/cell_lines/' do
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/cell_lines/' do
    context 'with correct parameter' do
      let(:collection) { Collection.first }
      let(:params) do
        {
          organism: 'something',
          tissue: 'another',
          amount: 100,
          passage: 200,
          disease: 'disease',
          material_names: '[sd]',
          biosafety_level: 'S1',
          collection_id: collection.id,
        }
      end

      before do
        post '/api/v1/cell_lines/', params: params, as: :json
      end

      it 'returns correct status code 201' do
        expect(response).to have_http_status :created
      end

      it 'returns correct represantation of saved cell line sample' do # rubocop:disable RSpec/MultipleExpectations
        expect(parsed_json_response['amount']).to be 100
        expect(parsed_json_response['passage']).to be 200
        expect(parsed_json_response['contamination']).to be_nil
        expect(parsed_json_response['source']).to be_nil
        expect(parsed_json_response['growth_medium']).to be_nil
        expect(parsed_json_response['name']).to be_nil
        expect(parsed_json_response['description']).to be_nil
        expect(parsed_json_response['cellline_material']['names']).to eq '[sd]'
        expect(parsed_json_response['cellline_material']['cell_type']).to be_nil
        expect(parsed_json_response['cellline_material']['organism']).to eq 'something'
        expect(parsed_json_response['cellline_material']['tissue']).to eq 'another'
        expect(parsed_json_response['cellline_material']['disease']).to eq 'disease'
        expect(parsed_json_response['cellline_material']['biosafety_level']).to eq 'S1'
      end
    end

    context 'with incorrect parameter' do
      let(:collection) { Collection.first }
      let(:params) do
        {
          passage: 200,
          disease: 'disease',
          material_names: '[sd]',
          biosafety_level: 'S1',
          collection_id: collection.id,
        }
      end

      before do
        post '/api/v1/cell_lines/', params: params, as: :json
      end

      it 'returns error status code 400' do
        expect(response).to have_http_status :bad_request
      end
    end
  end
end
