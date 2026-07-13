# frozen_string_literal: true

describe Chemotion::CollectionShareAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:third_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:collection_share) { create(:collection_share, shared_with: other_user, collection: collection) }

  describe 'POST /api/v1/collection_shares' do
    let(:create_params) do
      {
        collection_id: collection.id,
        user_ids: [other_user.id, third_user.id],
        permission_level: CollectionShare.permission_level(:manage_shares),
        celllinesample_detail_level: 5,
        devicedescription_detail_level: 5,
        element_detail_level: 5,
        reaction_detail_level: 5,
        researchplan_detail_level: 5,
        sample_detail_level: 5,
        screen_detail_level: 5,
        sequencebasedmacromoleculesample_detail_level: 5,
        wellplate_detail_level: 5,
      }
    end

    it 'creates a new share for the collection' do
      expect do
        post '/api/v1/collection_shares/', params: create_params
        collection.reload
      end.to change(CollectionShare, :count).by(create_params[:user_ids].length)
         .and change(collection, :shared?).from(false).to(true)
    end
  end

  describe 'PUT /api/v1/collection_shares' do
    let(:update_params) do
      {
        permission_level: CollectionShare.permission_level(:pass_ownership),
        celllinesample_detail_level: 5,
        devicedescription_detail_level: 5,
        element_detail_level: 5,
        reaction_detail_level: 5,
        researchplan_detail_level: 5,
        sample_detail_level: 5,
        screen_detail_level: 5,
        sequencebasedmacromoleculesample_detail_level: 5,
        wellplate_detail_level: 5,
      }
    end

    before { collection_share }

    it 'updates an existing share correctly' do
      put "/api/v1/collection_shares/#{collection_share.id}", params: update_params

      result = parsed_json_response['collection_share']
      expected_result = update_params.dup.stringify_keys

      expect(result).to include(expected_result)
    end
  end

  describe 'DELETE /api/v1/collection_shares/:id' do
    before do
      collection_share
      collection.update(shared: true)
    end

    it 'deletes the collection id' do
      expect do
        delete "/api/v1/collection_shares/#{collection_share.id}"
      end.to change(CollectionShare, :count).by(-1)
    end

    it 'responds 204 No Content with an empty body' do
      delete "/api/v1/collection_shares/#{collection_share.id}"
      expect(response).to have_http_status(:no_content)
      expect(response.body).to be_blank
    end

    it 'updates the collections shared flag if that was the last share' do
      expect(collection.collection_shares.count).to eq 1
      expect do
        delete "/api/v1/collection_shares/#{collection_share.id}"
        collection.reload
      end.to change(CollectionShare, :count).by(-1)
         .and change(collection, :shared?).from(true).to(false)
    end

    context 'when the share belongs to one of the requesters groups' do
      let(:collection) { create(:collection, user: other_user) }
      let(:group) { create(:group, users: [user]) }
      # Below :manage_shares on purpose — a group share at or above that rung would make every member
      # a delegated administrator of the collection, which is a different situation entirely.
      let(:group_share) do
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      before { group_share }

      # The group's share is not the requester's to reject: destroying it would revoke the collection
      # for every other member. To drop group-derived access the user leaves the group.
      it 'refuses to delete it' do
        expect { delete "/api/v1/collection_shares/#{group_share.id}" }
          .not_to change(CollectionShare, :count)

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when the share is neither the requesters nor on a collection they own' do
      let(:foreign_share) do
        create(:collection_share, collection: create(:collection, user: other_user), shared_with: third_user)
      end

      before { foreign_share }

      it 'responds 403 rather than raising' do
        expect { delete "/api/v1/collection_shares/#{foreign_share.id}" }
          .not_to change(CollectionShare, :count)

        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when the requester rejects their own direct share' do
      let(:collection) { create(:collection, user: other_user) }
      let(:own_share) { create(:collection_share, collection: collection, shared_with: user) }

      before { own_share }

      it 'deletes it' do
        expect { delete "/api/v1/collection_shares/#{own_share.id}" }
          .to change(CollectionShare, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end
    end
  end

  describe 'GET /api/v1/collection_shares/for_me' do
    subject(:shares) do
      get "/api/v1/collection_shares/for_me?collection_id=#{collection.id}"
      parsed_json_response['collection_shares']
    end

    let(:collection) { create(:collection, user: other_user) }
    let(:group) { create(:group, users: [user]) }

    context 'when the collection is shared to the user directly' do
      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      it 'returns the direct share with its type and permission level' do
        expect(shares).to contain_exactly(
          include('shared_with_type' => 'Person',
                  'permission_level' => CollectionShare.permission_level(:read_elements)),
        )
      end
    end

    context 'when the collection reaches the user through a group' do
      before do
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:edit_elements))
      end

      it 'returns the group share' do
        expect(shares).to contain_exactly(include('shared_with_type' => 'Group'))
      end
    end

    context 'when the collection is shared both directly and through a group' do
      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:read_elements))
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:edit_elements))
      end

      it 'returns both contributing shares' do
        expect(shares.pluck('shared_with_type')).to contain_exactly('Person', 'Group')
      end
    end

    context 'when the user has no share on the collection' do
      before do
        create(:collection_share, collection: collection, shared_with: third_user,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      # The load-bearing privacy check: a user must never see another recipient's share.
      it 'returns nothing and does not leak the other recipients share' do
        expect(shares).to be_empty
      end
    end
  end

  describe 'permission_level validation' do
    it 'rejects a level that is not on the ladder' do
      post '/api/v1/collection_shares/',
           params: { collection_id: collection.id, user_ids: [other_user.id], permission_level: 42 }

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe 'sharing a collection with its own owner' do
    it 'is refused' do
      post '/api/v1/collection_shares/', params: { collection_id: collection.id, user_ids: [user.id] }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  # `user` (the authenticated requester) is not the owner here — they hold a delegated
  # :manage_shares share on another user's collection.
  describe 'delegated share management (:manage_shares)' do
    let(:collection) { create(:collection, user: other_user) }
    let(:manage_shares) { CollectionShare.permission_level(:manage_shares) }

    before do
      create(:collection_share, collection: collection, shared_with: user, permission_level: manage_shares)
    end

    it 'lets the delegate list the collection shares' do
      get '/api/v1/collection_shares', params: { collection_id: collection.id }

      expect(response).to have_http_status(:ok)
    end

    it 'lets the delegate share the collection onward at or below their own level' do
      expect do
        post '/api/v1/collection_shares/',
             params: { collection_id: collection.id, user_ids: [third_user.id], permission_level: manage_shares }
      end.to change(CollectionShare, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it 'refuses to let the delegate grant a level above their own' do
      expect do
        post '/api/v1/collection_shares/',
             params: {
               collection_id: collection.id,
               user_ids: [third_user.id],
               permission_level: CollectionShare.permission_level(:pass_ownership),
             }
      end.not_to change(CollectionShare, :count)

      expect(response).to have_http_status(:forbidden)
    end

    it 'refuses to let the delegate revoke a share that outranks them' do
      superior = create(
        :collection_share,
        collection: collection,
        shared_with: third_user,
        permission_level: CollectionShare.permission_level(:pass_ownership),
      )

      expect { delete "/api/v1/collection_shares/#{superior.id}" }.not_to change(CollectionShare, :count)
      expect(response).to have_http_status(:forbidden)
    end

    it 'still lets any sharee reject their own share, whatever its level' do
      own_share = CollectionShare.find_by(collection: collection, shared_with: user)

      expect { delete "/api/v1/collection_shares/#{own_share.id}" }.to change(CollectionShare, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end

  describe 'a sharee below :manage_shares' do
    let(:collection) { create(:collection, user: other_user) }

    before do
      create(
        :collection_share,
        collection: collection,
        shared_with: user,
        permission_level: CollectionShare.permission_level(:remove_elements),
      )
    end

    it 'cannot administrate the share list' do
      post '/api/v1/collection_shares/', params: { collection_id: collection.id, user_ids: [third_user.id] }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'offering ownership (pass_ownership share)' do
    let(:pass_ownership) { CollectionShare.permission_level(:pass_ownership) }

    it 'refuses to offer ownership to a group' do
      collection = create(:collection, user: user)
      group = create(:group)

      post '/api/v1/collection_shares/',
           params: { collection_id: collection.id, user_ids: [group.id], permission_level: pass_ownership }

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'refuses a manage_shares delegate offering ownership (above their own level)' do
      collection = create(:collection, user: other_user)
      create(:collection_share, collection: collection, shared_with: user,
                                permission_level: CollectionShare.permission_level(:manage_shares))

      post '/api/v1/collection_shares/',
           params: { collection_id: collection.id, user_ids: [third_user.id], permission_level: pass_ownership }

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'POST /api/v1/collection_shares/take_ownership/:collection_id' do
    let(:collection) { create(:collection, user: other_user) }

    context 'when the user holds a pass-ownership offer' do
      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:pass_ownership))
      end

      it 'transfers ownership to the user and demotes the former owner' do
        post "/api/v1/collection_shares/take_ownership/#{collection.id}"

        expect(response).to have_http_status(:created)
        expect(collection.reload.user_id).to eq(user.id)
        expect(CollectionShare.find_by(collection: collection, shared_with_id: other_user.id).permission_level)
          .to eq(CollectionShare.permission_level(:manage_shares))
      end
    end

    context 'without an offer' do
      it 'is forbidden' do
        expect { post "/api/v1/collection_shares/take_ownership/#{collection.id}" }
          .not_to(change { collection.reload.user_id })

        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
