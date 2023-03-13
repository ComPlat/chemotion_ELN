# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SuggestionAPI do
  let!(:user) { create(:person, first_name: 'tam', last_name: 'M') }
  let(:collection) { create(:collection, user: user, is_shared: true, permission_level: 1) }
  let(:query) { 'query' }

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
