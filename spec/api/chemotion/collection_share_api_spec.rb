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
        permission_level: 5,
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
        permission_level: 5,
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
      let(:group_share) { create(:collection_share, collection: collection, shared_with: group) }

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
end
