# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PermissionAPI do
  context 'authorized user logged in' do
    let(:user)                               { create(:user, first_name: 'Musashi', last_name: 'M') }
    let(:other_user)                         { create(:user) }
    let(:third_user)                         { create(:user) }
    let(:unshared_collection_of_user)        { create(:collection, user: user) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/permissions/sharing' do
      let(:reaction_1) { create(:reaction, collections: [unshared_collection_of_user]) }
      let(:wellplate_1) { create(:wellplate, collections: [unshared_collection_of_user]) }
      let(:screen_1) { create(:screen, collections: [unshared_collection_of_user]) }

      let!(:params) do
        {
          currentCollection: { id: unshared_collection_of_user.id },
          elements_filter: {
            sample: {
              all: true,
              included_ids: [],
              excluded_ids: []
            },
            reaction: {
              all: true,
              included_ids: [],
              excluded_ids: [reaction_1.id]
            },
            wellplate: {
              all: false,
              included_ids: [wellplate_1.id],
              excluded_ids: []
            },
            screen: {
              all: false,
              included_ids: [screen_1.id],
              excluded_ids: []
            }
          }
        }
      end

      it 'responds with true if sharing allowed' do
        post '/api/v1/permissions/status',
          params: params.to_json,
          headers: { 'CONTENT_TYPE' => 'application/json' }

        expect(JSON.parse(response.body)['sharing_allowed']).to eq true
      end
    end
  end
end
