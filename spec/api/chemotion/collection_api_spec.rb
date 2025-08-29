# frozen_string_literal: true

describe Chemotion::CollectionAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:collection_with_shares) do
    create(:collection, user: user).tap do |collection_with_shares|
      create(:collection_share, collection: collection_with_shares, shared_with: other_user)
    end
  end
  let(:collection_shared_with_user) do
    create(:collection, user: other_user).tap do |other_users_collection|
      create(:collection_share, collection: other_users_collection, shared_with: user)
    end
  end

  describe 'GET /api/v1/collections' do
    before do
      collection
      collection_with_shares
      collection_shared_with_user
    end

    it 'returns all accessible collections for current user' do
      get '/api/v1/collections'
      result = parsed_json_response['collections']
      expect(result.length).to eq 3

      sorted_actual_collection_ids = result.map { |collection| collection['id'] }.sort
      sorted_expected_collection_ids = [collection.id, collection_with_shares.id, collection_shared_with_user.id]
      expect(sorted_actual_collection_ids).to eq sorted_expected_collection_ids
    end
  end
end
