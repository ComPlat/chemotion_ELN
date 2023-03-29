# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ShareTempCollectionAPI do
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
    # let!(:shared_c)   { create(:collection, user: user, is_shared: true) }

    let(:s1)  { create(:sample, collections: [c1]) }
    let(:s3)  { create(:sample, collections: [c1]) }
    let!(:r1) { create(:reaction, collections: [c1], samples: [s3]) }
    let(:w1)  { create(:wellplate, collections: [c1]) }
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/share_temp_collections/<id>' do

      context 'when no error occurs' do
        let!(:c) { create(:collection, user_id: user.id) }
        let!(:collection_acl) { create(:collection_acl, collection: c, user: user) }

        before do
          get "/api/v1/share_temp_collections/#{c.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns serialized research_plan_metadata' do
          expect(JSON.parse(response.body)['collection']['id']).to eq c.id
        end
      end
    end

    describe 'GET /api/v1/share_temp_collections' do

      context 'when no error occurs' do
        let!(:c) { create(:collection, user_id: user.id) }
        let!(:collection_acl) { create(:collection_acl, collection: c, user: user) }

        it 'returns list of all collections shared with user' do
          get '/api/v1/share_temp_collections'

          expect(parsed_json_response['collections'].length).to eq(1)
        end
      end
    end

    describe 'POST /api/v1/share_temp_collections/all' do
      describe 'sharing whole collection' do
        context 'with appropriate permissions' do
          let(:c1)  { create(:collection, user: user) }
          let(:s1)  { create(:sample, collections: [c1]) }
          let(:s2)  { create(:sample, collections: [c1]) }
          let(:s3)  { create(:sample, collections: [c1]) }
          let!(:r1) { create(:reaction, collections: [c1], samples: [s3]) }
          let(:w1)  { create(:wellplate, collections: [c1]) }
          let(:sc1) { create(:screen, collections: [c1]) }

          let!(:params) do
            {
              currentCollection: { id: c1.id },
              collection_attributes: attributes_for(:collection),
              user_ids: [{ value: u2.email }],
              elements_filter: {
                sample: {
                  all: true,
                  included_ids: [s1.id],
                  excluded_ids: [s2.id]
                },
                reaction: {
                  all: true,
                  included_ids: [],
                  excluded_ids: []
                },
                wellplate: {
                  all: false,
                  included_ids: [w1.id],
                  excluded_ids: []
                },
                screen: {
                  all: true,
                  included_ids: [],
                  excluded_ids: [sc1.id]
                },
                research_plan: {}
              }
            }
          end

          it 'creates shared collection' do
            post '/api/v1/share_temp_collections',
              params: params.to_json, headers: { 'CONTENT_TYPE' => 'application/json' }

            expect(response).to have_http_status(:created)
          end
        end
      end
    end
  end
end
