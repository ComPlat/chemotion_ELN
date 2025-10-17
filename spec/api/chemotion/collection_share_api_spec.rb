# frozen_string_literal: true

describe Chemotion::CollectionShareAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:third_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:collection_share) { create(:collection_share, shared_with: other_user, collection: collection) }

  describe 'GET /api/v1/collection_shares?collection_id=:id' do

  end

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
        post "/api/v1/collection_shares/", params: create_params
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

    it 'updates the collections shared flag if that was the last share' do
      expect(collection.collection_shares.count).to eq 1
      expect do
        delete "/api/v1/collection_shares/#{collection_share.id}"
        collection.reload
      end.to change(CollectionShare, :count).by(-1)
         .and change(collection, :shared?).from(true).to(false)
    end
  end
end
