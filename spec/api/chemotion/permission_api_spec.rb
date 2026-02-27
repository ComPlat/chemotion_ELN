# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable Naming/VariableNumber, RSpec/NestedGroups
describe Chemotion::PermissionAPI do
  include_context 'api request authorization context'
  let(:other_user)                         { create(:person) }
  let(:unshared_collection_of_user)        { create(:collection, user: user) }
  let(:permission_level) { CollectionShare.permission_level(:pass_ownership) }
  let(:shared_collection_of_other_user) do
    create(:collection, user: other_user).tap do |collection|
      create(:collection_share, collection: collection, permission_level: permission_level, shared_with: user)
    end
  end

  describe 'POST /api/v1/permissions/sharing' do
    context 'when requesting status for regular elements in own collection' do
      let(:reaction_1) { create(:reaction, collections: [unshared_collection_of_user]) }
      let(:wellplate_1) { create(:wellplate, collections: [unshared_collection_of_user]) }
      let(:screen_1) { create(:screen, collections: [unshared_collection_of_user]) }

      let!(:params) do
        {
          currentCollection: { id: unshared_collection_of_user.id },
          sample: {
            checkedAll: true,
            checkedIds: [],
            uncheckedIds: [],
          },
          reaction: {
            checkedAll: true,
            checkedIds: [],
            uncheckedIds: [reaction_1.id],
          },
          wellplate: {
            checkedAll: false,
            checkedIds: [wellplate_1.id],
            uncheckedIds: [],
          },
          screen: {
            checkedAll: false,
            checkedIds: [screen_1.id],
            uncheckedIds: [],
          },
        }
      end

      it 'responds with true if sharing allowed' do
        post '/api/v1/permissions/status', params: params

        expect(response.status).to eq 201
        expected_result = {
          'is_top_secret' => false,
          'sharing_allowed' => true,
          'deletion_allowed' => true,
        }
        expect(parsed_json_response).to eq expected_result
      end
    end

    context 'when a top secret element is selected' do
      let(:sample) { create(:sample, collections: [unshared_collection_of_user]) }
      let(:top_secret_sample) { create(:sample, is_top_secret: true, collections: [unshared_collection_of_user]) }

      let(:params) do
        {
          currentCollection: { id: unshared_collection_of_user.id },
          sample: {
            checkedAll: false,
            checkedIds: [sample.id, top_secret_sample.id],
            uncheckedIds: [],
          },
        }
      end

      it 'returns is_top_secret=true' do
        post '/api/v1/permissions/status', params: params

        expect(response.status).to eq 201
        expected_result = {
          'is_top_secret' => true,
          'sharing_allowed' => true,
          'deletion_allowed' => true,
        }
        expect(parsed_json_response).to eq expected_result
      end
    end

    context 'when requesting permission status for elements of a shared collection' do
      let(:sample) { create(:sample, collections: [shared_collection_of_other_user]) }
      let(:params) do
        {
          currentCollection: { id: shared_collection_of_other_user.id },
          sample: {
            checkedAll: false,
            checkedIds: [sample.id],
            uncheckedIds: [],
          },
        }
      end

      before do
        post '/api/v1/permissions/status', params: params
      end

      context 'when the permission level is high enough for deletion' do
        let(:permission_level) { CollectionShare.permission_level(:delete_elements) }

        it 'returns deletion_allowed=true and sharing_allowed=true' do
          expect(parsed_json_response['deletion_allowed']).to be true
          expect(parsed_json_response['sharing_allowed']).to be true
        end
      end

      context 'when the permission level is only sufficient for sharing' do
        let(:permission_level) { CollectionShare.permission_level(:share_collection) }

        it 'returns deletion_allowed=false and sharing_allowed=true' do
          expect(parsed_json_response['deletion_allowed']).to be false
          expect(parsed_json_response['sharing_allowed']).to be true
        end
      end

      context 'when the permission level is too low' do
        let(:permission_level) { CollectionShare.permission_level(:write_elements) }

        it 'returns deletion_allowed=false and sharing_allowed=false' do
          expect(parsed_json_response['deletion_allowed']).to be false
          expect(parsed_json_response['sharing_allowed']).to be false
        end
      end
    end
  end
end
# rubocop:enable Naming/VariableNumber, RSpec/NestedGroups
