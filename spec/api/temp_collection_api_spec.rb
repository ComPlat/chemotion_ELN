# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::TempCollectionAPI do
  let(:json_options) do
    {
    only: %i[id label],
    methods: %i[
        children descendant_ids permission_level shared_by_id
        sample_detail_level reaction_detail_level wellplate_detail_level
        screen_detail_level is_shared is_locked sync_collections_users
        shared_users is_synchronized is_remote shared_to
      ]
    }
  end

  context 'authorized user logged in' do
    let!(:user)  { create(:person, first_name: 'Musashi', last_name: 'M') }
    let!(:u2)    { create(:person) }
    let(:group) { create(:group) }
    let!(:c1)   { create(:collection, user: user) }
    let!(:shared_c)   { create(:collection, user: user, is_shared: true) }

    let(:s1)  { create(:sample, collections: [c1]) }
    # let(:s2)  { create(:sample, collections: [c1]) }
    let(:s3)  { create(:sample, collections: [c1]) }
    let!(:r1) { create(:reaction, collections: [c1], samples: [s3]) }
    let(:w1)  { create(:wellplate, collections: [c1]) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end


    describe 'GET /api/v1/temp_collections' do

      context 'when no error occurs' do
        it 'returns a list of collections' do
          get '/api/v1/temp_collections'
          expect(parsed_json_response['collections'].length).to eq(4)
        end
      end
    end

    describe 'GET /api/v1/temp_collections/<id>' do
      before do
        get "/api/v1/temp_collections/#{c1.id}"
      end

      it 'returns http ok' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns collection by id' do
        c = JSON.parse(response.body)['collection']&.symbolize_keys
        expect(c[:id]).to eq(c1.id)
      end
    end
  end
end
