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

  describe 'GET /api/v1/collections/:id' do
    before do
      collection
    end

    it 'returns a serialized collection' do
      get "/api/v1/collections/#{collection.id}"

      expected_serialization = {
        'id' => collection.id,
        'ancestry' => collection.ancestry,
        'position' => collection.position,
        'label' => collection.label,
        'tabs_segment' => collection.tabs_segment,
        'inventory_id' => collection.inventory_id,
        'owner' => "#{collection.user.name} (#{collection.user.name_abbreviation})",
        'shares' => []
      }

      expect(parsed_json_response['collection']).to eq expected_serialization
    end
  end

  describe 'POST /api/v1/collections' do
    context 'when adding a new root collection' do
      it 'saves the collection' do
        params = { parent_id: nil, label: 'Some collection' }
        post '/api/v1/collections', params: params

        expect(response.status).to eq 201
        expect(parsed_json_response['collection']['label']).to eq 'Some collection'
      end

      it 'assigns ancestry /' do
        params = { parent_id: nil, label: 'Some collection' }
        post '/api/v1/collections', params: params

        expect(response.status).to eq 201
        expect(parsed_json_response['collection']['ancestry']).to eq '/'
      end
    end

    context 'when adding a new child collection' do
      it 'does not allow creating a child collection for a shared collection' do
        params = {
          parent_id: collection_shared_with_user.id,
          label: 'Collection that should not be saved'
        }

        expect { post '/api/v1/collections', params: params }.to raise_error(ActiveRecord::RecordNotFound)
      end

      it 'adds the new collection as the first child and reorders all other children' do
        parent_collection = collection
        first_child = create(:collection, label: 'first child before insert', position: 1, parent: parent_collection, user: user)
        second_child = create(:collection, label: 'second child before insert', position: 2, parent: parent_collection, user: user)

        creation = ->() { post '/api/v1/collections', params: { parent_id: collection.id, label: 'new collection' } }
        expect(creation).to change(Collection, :count).by(1)

        expect(parsed_json_response['collection']['position']).to eq 1
        expect(parsed_json_response['collection']['ancestry']).to eq "/#{parent_collection.id}/"
        expect(first_child.reload.position).to be 2
        expect(second_child.reload.position).to be 3
      end
    end
  end
end
