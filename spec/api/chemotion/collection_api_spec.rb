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
  let(:other_users_collection) { create(:collection, user: build(:person)) }

  # describe 'GET PERFORMANCECHECK' do
  #   let(:other_users) { create_list(:person, 100) }
  #   let(:collection_tree) do
  #     collections_per_nesting_level = 10
  #     collections_per_nesting_level.times do |i|
  #       collection = create(:collection, user: user, position: i+1)
  #       other_users.each { |other_user| create(:collection_share, collection: collection, shared_with: other_user) }
  #       collections_per_nesting_level.times do |j|
  #         child_collection = create(:collection, user: user, parent: collection, position: j+1)
  #         other_users.each { |other_user| create(:collection_share, collection: child_collection, shared_with: other_user ) }
  #         collections_per_nesting_level.times do |k|
  #           grandchild_collection = create(:collection, user: user, parent: child_collection, position: k+1)
  #           other_users.each { |other_user| create(:collection_share, collection: grandchild_collection, shared_with: other_user) }
  #         end
  #       end
  #     end
  #   end

  #   it 'performs adequately' do
  #     collection_tree


  #     starting = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  #     get '/api/v1/collections'
  #     ending = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  #     elapsed = ending - starting

  #     result = parsed_json_response['own']
  #     binding.pry
  #   end
  # end

  describe 'GET /api/v1/collections' do
    before do
      collection
      collection_with_shares
      collection_shared_with_user
    end

    it 'returns all accessible collections for current user' do
      get '/api/v1/collections'
      own_collections = parsed_json_response['own']
      shared_collections = parsed_json_response['shared_with_me']
      expect(own_collections.length).to eq 4 # contains All-Collection and chemotion-repository.net as well
      expect(shared_collections.length).to eq 1

      expect(own_collections.map {|c| c['id'].to_i }).to include(collection.id)
      expect(own_collections.map {|c| c['id'].to_i }).to include(collection_with_shares.id)
      expect(shared_collections.map {|c| c['id'].to_i }).to include(collection_shared_with_user.id)
    end
  end

  describe 'GET /api/v1/collections/:id' do
    context 'when requested collection is ALL-collection' do
      before do
        collection
      end

      it "returns the users all-collection" do
        get "/api/v1/collections/all"

        expect(parsed_json_response['collection']['label']).to eq 'All'
        expect(parsed_json_response['collection']['id'].to_i).to eq Collection.get_all_collection_for_user(user.id).id
      end
    end

    context 'when requested collection is owned by the user' do
      before do
        collection
      end
      it 'returns a serialized own collection' do
        get "/api/v1/collections/#{collection.id}"

        expect(parsed_json_response['collection']).not_to have_key('owner') # own collection does not expose owner
      end
    end

    context 'when requested collection is shared to the user' do
      let(:collection) { collection_shared_with_user }
      before { collection }

      it 'returns a serialized shared collection' do
        get "/api/v1/collections/#{collection.id}"

        expect(parsed_json_response['collection']).to have_key('owner')
      end
    end

    context 'when user has no access to the requested collection' do
      let(:collection) { other_users_collection }
      before { collection }
      it 'returns a 404 error' do
        get "/api/v1/collections/#{collection.id}"
        expect(response.status).to be 404
      end
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
          parent_id: other_users_collection.id,
          label: 'Collection that should not be saved'
        }

        post '/api/v1/collections', params: params
        expect(response.status).to eq 404
      end

      it 'adds the new collection as the last child without changing any position fields of other collections' do
        parent_collection = collection
        first_child = create(:collection, label: 'first child before insert', position: 1, parent: parent_collection, user: user)
        second_child = create(:collection, label: 'second child before insert', position: 2, parent: parent_collection, user: user)

        creation = ->() { post '/api/v1/collections', params: { parent_id: collection.id, label: 'new collection' } }
        expect(creation).to change(Collection, :count).by(1)

        expect(parsed_json_response['collection']['position']).to eq 3
        expect(parsed_json_response['collection']['ancestry']).to eq "/#{parent_collection.id}/"
        expect(first_child.reload.position).to be 1
        expect(second_child.reload.position).to be 2
      end
    end
  end

  describe 'PUT /api/v1/collections/bulk_update_own_collections' do
    let(:collection_A) { create(:collection, label: 'Collection A', user: user, position: 1) }
    let(:collection_AA) { create(:collection, label: "Collection AA", parent: collection_A, user: user, position: 1) }
    let(:collection_AB) { create(:collection, label: "Collection AB", parent: collection_A, user: user, position: 2) }
    let(:collection_ABA) { create(:collection, label: "Collection ABA", parent: collection_AB, user: user, position: 1) }
    let(:collection_B) { create(:collection, label: 'Collection B', user: user, position: 2) }
    let(:collection_BA) { create(:collection, label: "Collection BA", parent: collection_B, user: user, position: 1) }
    let(:collection_BAA) { create(:collection, label: "Collection BAA", parent: collection_BA, user: user, position: 1) }
    let(:collection_BAB) { create(:collection, label: "Collection BAB", parent: collection_BA, user: user, position: 2) }
    let(:collection_BB) { create(:collection, label: "Collection BB", parent: collection_B, user: user, position: 2) }
    let(:collection_C) { create(:collection, label: 'Collection C', user: user, position: 3) }

    let(:collections) do
      [
        collection_A,
          collection_AA,
          collection_AB,
            collection_ABA,
        collection_B,
          collection_BA,
            collection_BAA,
            collection_BAB,
          collection_BB,
        collection_C
      ]
    end

    it 'updates the collection tree correctly' do
      put_data = [
        { id: collection_C.id, label: 'Collection C', children: [
          { id: collection_BA.id, label: "Collection BA", children: [
            { id: collection_AB.id, label: "Collection AB" },
          ]},
          { id: collection_BAB.id, label: "Collection BAB", children: [
            { id: collection_AA.id, label: "Collection AA", children: [
              { id: collection_A.id, label: "Collection A" },
            ]}
          ]}
        ]},
        { id: collection_ABA.id, label: "Collection ABA", children: [
          { id: collection_BAA.id, label: "Collection BAA" }
        ]},
        { id: collection_B.id, label: "Collection B", children: [
          { id: collection_BB.id, label: "Collection BB" },
        ]}
      ]

      put '/api/v1/collections/bulk_update_own_collections', params: { collections: put_data }

      updated_collection_tree = parsed_json_response['collections']

      updated_collection_C = updated_collection_tree.find { |c| c['label'] == 'Collection C' }
        updated_collection_BA = updated_collection_tree.find { |c| c['label'] == 'Collection BA' }
          updated_collection_AB = updated_collection_tree.find { |c| c['label'] == 'Collection AB' }
        updated_collection_BAB = updated_collection_tree.find { |c| c['label'] == 'Collection BAB' }
          updated_collection_AA = updated_collection_tree.find { |c| c['label'] == 'Collection AA' }
            updated_collection_A = updated_collection_tree.find { |c| c['label'] == 'Collection A' }
      updated_collection_ABA = updated_collection_tree.find { |c| c['label'] == 'Collection ABA' }
        updated_collection_BAA = updated_collection_tree.find { |c| c['label'] == 'Collection BAA' }
      updated_collection_B = updated_collection_tree.find { |c| c['label'] == 'Collection B' }
        updated_collection_BB = updated_collection_tree.find { |c| c['label'] == 'Collection BB' }

      expect(updated_collection_C).to include("id" => collection_C.id, "label" => "Collection C", "ancestry" => '/', "position" => 1 )
        expect(updated_collection_BA).to include("id" => collection_BA.id, "label" => "Collection BA", "ancestry" => "/#{collection_C.id}/", "position" => 1)
          expect(updated_collection_AB).to include("id" => collection_AB.id, "label" => "Collection AB", "ancestry" => "/#{collection_C.id}/#{collection_BA.id}/", "position" => 1)
        expect(updated_collection_BAB).to include("id" => collection_BAB.id, "label" => "Collection BAB", "ancestry" => "/#{collection_C.id}/", "position" => 2)
          expect(updated_collection_AA).to include("id" => collection_AA.id, "label" => "Collection AA", "ancestry" => "/#{collection_C.id}/#{collection_BAB.id}/", "position" => 1)
            expect(updated_collection_A).to include("id" => collection_A.id, "label" => "Collection A", "ancestry" => "/#{collection_C.id}/#{collection_BAB.id}/#{collection_AA.id}/", "position" => 1)
      expect(updated_collection_ABA).to include("id" => collection_ABA.id, "label" => "Collection ABA", "ancestry" => "/", "position" => 2)
        expect(updated_collection_BAA).to include("id" => collection_BAA.id, "label" => "Collection BAA", "ancestry" => "/#{collection_ABA.id}/", "position" => 1)
      expect(updated_collection_B).to include("id" => collection_B.id, "label" => "Collection B", "ancestry" => "/", "position" => 3)
        expect(updated_collection_BB).to include("id" => collection_BB.id, "label" => "Collection BB", "ancestry" => "/#{collection_B.id}/", "position" => 1)
    end
  end

  describe 'POST /api/v1/collections/export' do
    before {
      collection
      collection_with_shares
      other_users_collection
    }
    context 'when exporting collections' do
      it 'exports the collections' do
        params = { collection_ids: [collection.id, collection_with_shares.id] }
        post '/api/v1/collections/export', params: params

        expect(parsed_json_response['status']).to eq 204
      end

      it 'does not export collections with empty collection ids' do
        params = { collection_ids: [] }.to_json
        post '/api/v1/collections/export', params: params, headers: { 'CONTENT_TYPE' => 'application/json' }

        expect(response.status).to eq 403
      end

      it 'does not export collection of wrong ownership' do
        params = { collection_ids: [other_users_collection.id] }
        post '/api/v1/collections/export', params: params

        expect(response.status).to eq 401
      end
    end
  end
end
