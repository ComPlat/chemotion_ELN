# frozen_string_literal: true

# rubocop:disable RSpec/LetSetup
require 'rails_helper'

describe Chemotion::SuggestionAPI do
  let!(:user) { create(:person, first_name: 'tam', last_name: 'M') }
  let(:collection) { create(:collection, user: user, is_shared: true, permission_level: 1, sample_detail_level: 10) }
  let(:query) { 'query' }
  let(:json_repsonse) { JSON.parse(response.body) }
  let(:json_response) { response.body }
  let(:params) do
    {
      collection_id: collection.id,
      query: query,
      is_sync: false,
    }
  end

  describe 'GET /api/v1/cell_lines/suggestions/cell_lines' do
    include_context 'api request authorization context'
    let!(:cell_line) { create(:cellline_sample, collections: [collection]) }
    let!(:cell_line2) { create(:cellline_sample, name: 'search-example', collections: [collection]) }
    let!(:cell_line_without_col) { create(:cellline_sample, name: 'search-example') }
    let!(:sample) { create(:sample, name: 'search-example', collections: [collection]) }

    before do
      get '/api/v1/suggestions/cell_lines', params: params
    end

    context 'when search term matches one cell line by the material name' do
      let(:query) { 'name-001' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'suggestions should be returned' do
        expect(json_repsonse['suggestions'].length).to be 1
        expect(json_repsonse['suggestions'].first['name']).to eq 'name-001'
        expect(json_repsonse['suggestions'].first['search_by_method']).to eq 'cell_line_material_name'
      end
    end

    context 'when search term matches one cell line by the sample name' do
      let(:query) { 'arch-examp' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'suggestions should be returned' do
        expect(json_repsonse['suggestions'].length).to be 1
        expect(json_repsonse['suggestions'].first['name']).to eq 'search-example'
        expect(json_repsonse['suggestions'].first['search_by_method']).to eq 'cell_line_sample_name'
      end
    end
  end

  describe 'GET /api/v1/cell_lines/suggestions/all' do
    include_context 'api request authorization context'
    let!(:cell_line) { create(:cellline_sample, collections: [collection]) }
    let!(:cell_line2) { create(:cellline_sample, name: 'search-example', collections: [collection]) }
    let!(:sample) { create(:sample, name: 'search-example', collections: [collection]) }

    before do
      get '/api/v1/suggestions/all', params: params
    end

    context 'when search term matches two cell line samples with the same material name' do
      let(:query) { 'name-001' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'suggestions should be returned' do
        expect(json_repsonse['suggestions'].length).to be 1
        expect(json_repsonse['suggestions'].first['name']).to eq 'name-001'
        expect(json_repsonse['suggestions'].first['search_by_method']).to eq 'cell_line_material_name'
      end
    end

    context 'when search term matches one cell line by the sample name' do
      let(:query) { 'arch-examp' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'two suggestions were found' do
        expect(json_repsonse['suggestions'].length).to be 2
      end

      it 'first suggestion from sample' do
        expect(json_repsonse['suggestions'].first['name']).to eq 'search-example'
        expect(json_repsonse['suggestions'].first['search_by_method']).to eq 'sample_name'
      end

      it 'second suggestion from cell line' do
        expect(json_repsonse['suggestions'].second['name']).to eq 'search-example'
        expect(json_repsonse['suggestions'].second['search_by_method']).to eq 'cell_line_sample_name'
      end
    end
  end

  context 'when user is authenticated' do
    include_context 'api request authorization context'
    it 'returns suggestions object with the correct structure' do
      get '/api/v1/suggestions/all',
          params: {
            collection_id: collection.id,
            query: query,
            is_sync: false,
          }
      expect(response).to have_http_status(:success)
      json_response = JSON.parse(response.body)
      expect(json_response.keys).to contain_exactly('suggestions')
      suggestions = json_response['suggestions']
      expect(suggestions).to be_an(Array)
    end
  end

  context 'when user is not authenticated' do
    it 'returns unauthorized error' do
      get '/api/v1/suggestions/all',
          params:
            {
              collection_id: collection.id,
              query: query,
              is_sync: false,
            }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
# rubocop:enable RSpec/LetSetup
