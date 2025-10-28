# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::InventoryAPI do
  include_context 'api request authorization context'

  let(:collection) { Collection.find_by(user_id: user.id) }

  describe 'PUT /api/v1/inventory/update_inventory_label' do
    let(:params) do
      {
        'prefix' => 'BNC',
        'name' => 'Bräse North Camp',
        'counter' => 0,
        'collection_ids' => [collection.id],
      }
    end

    let(:expected_response) do
      Inventory.create_or_update_inventory_label(
        'BNC',
        'Bräse North Camp',
        0,
        [collection.id],
        user,
      ).to_json
    end

    before do
      put '/api/v1/inventory/update_inventory_label', params: params
    end

    it 'updates sample inventory label for user' do
      expect(response).to have_http_status(:ok)
      expect(response.body).to eq(expected_response)
    end
  end

  describe 'GET user_inventory_collections' do
    before do
      get '/api/v1/inventory/user_inventory_collections'
    end

    let(:expected_response) do
      { inventory_collections: Collection.inventory_collections(collection.user) }.to_json
    end

    it 'fetch own collections for user' do
      json_response = JSON.parse(response.body)
      expect(json_response).to have_key('inventory_collections')
    end
  end

  describe 'GET inventory/collection_id' do
    before do
      allow(Inventory).to receive(:by_collection_id).and_return([build(:inventory)])
    end

    it 'fetch inventory for collection' do
      get "/api/v1/inventory/#{collection.id}"

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to include('id', 'prefix', 'name', 'counter')
    end
  end
end
