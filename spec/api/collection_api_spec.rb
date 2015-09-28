require 'rails_helper'

describe Chemotion::CollectionAPI do
  let(:json_options) {
    {
      only: [:id, :label],
      methods: [:children, :descendant_ids, :permission_level, :sample_detail_level, :reaction_detail_level, :wellplate_detail_level]
    }
  }

  context 'authorized user logged in' do
    let(:user)  { create(:user, name: 'Musashi') }
    let!(:c1)   { create(:collection, user: user, is_shared: false) }
    let!(:c2)   { create(:collection, user: user, shared_by_id: user.id, is_shared: true) }
    let!(:c3)   { create(:collection, is_shared: false) }
    let!(:c4)   { create(:collection, user: user, shared_by_id: user.id+1, is_shared: true) }
    let!(:c5)   { create(:collection, shared_by_id: user.id+1, is_shared: true) }

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/collections/roots' do
      it 'returns serialized (unshared) collection roots of logged in user' do
        get '/api/v1/collections/roots'

        expect(JSON.parse(response.body)['collections']).to eq [c1.as_json(json_options)]
      end
    end

    describe 'GET /api/v1/collections/shared_roots' do
      it 'returns serialized (shared) collection roots of logged in user' do
        get '/api/v1/collections/shared_roots'

        expect(JSON.parse(response.body)['collections']).to eq [c2.as_json(json_options)]
      end
    end

    describe 'GET /api/v1/collections/remote_roots' do
      it 'returns serialized (remote) collection roots of logged in user' do
        get '/api/v1/collections/remote_roots'

        expect(JSON.parse(response.body)['collections']).to eq [c4.as_json(json_options)]
      end
    end

    describe 'PUT /api/v1/collections/shared/:id' do
      let(:params) {
        {
          permission_level: 13,
          sample_detail_level: 5,
          reaction_detail_level: 2,
          wellplate_detail_level: 1
        }
      }

      before {
        put "/api/v1/collections/shared/#{c2.id}", params
        c2.reload
      }

      it 'updates permission and detail levels of specified shared collection' do
        expect(c2.permission_level).to eq 13
        expect(c2.sample_detail_level).to eq 5
        expect(c2.reaction_detail_level).to eq 2
        expect(c2.wellplate_detail_level).to eq 1
      end
    end

    describe 'POST /api/v1/collections/shared' do
      describe 'sharing' do
        context 'with appropriate permissions' do
          let(:c1) { create(:collection, user: user) }
          let(:c2) { create(:collection, user: user, is_shared: true, permission_level: 2) }
          let(:s1) { create(:sample) }
          let(:s2) { create(:sample) }
          let(:r1) { create(:reaction) }
          let(:r2) { create(:reaction) }
          let(:w1) { create(:wellplate) }
          let(:w2) { create(:wellplate) }

          let!(:params) {
            {
              collection_attributes: attributes_for(:collection),
              user_ids: [user.id],
              elements_filter: {
                sample: {
                  all: false,
                  included_ids: [s1.id, s2.id],
                  excluded_ids: []
                },
                reaction: {
                  all: true,
                  included_ids: [],
                  excluded_ids: [r2.id]
                },
                wellplate: {
                  all: false,
                  included_ids: [w1.id],
                  excluded_ids: []
                }
              }
            }
          }

          before do
            CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
            CollectionsSample.create!(collection_id: c2.id, sample_id: s2.id)
            CollectionsReaction.create!(collection_id: c1.id, reaction_id: r1.id)
            CollectionsReaction.create!(collection_id: c1.id, reaction_id: r2.id)
            CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w1.id)
            CollectionsWellplate.create!(collection_id: c2.id, wellplate_id: w2.id)

            post '/api/v1/collections/shared', params
          end

          it 'creates shared collection with given samples' do
            post '/api/v1/collections/shared', params

            # naming convention for shared collections
            c = Collection.find_by(label: 'My project with Musashi')
            expect(c).to_not be_nil
            expect(c.user_id).to eq user.id
            expect(c.samples).to match_array [s1, s2]
            expect(c.reactions).to match_array [r1]
            expect(c.wellplates).to match_array [w1]
          end
        end

        context 'with inappropriate permissions' do
          let(:c1) { create(:collection, user: user) }
          let(:c2) { create(:collection, user: user, is_shared: true, permission_level: 1) }
          let(:s1) { create(:sample) }
          let(:s2) { create(:sample) }

          let!(:params) {
            {
              collection_attributes: attributes_for(:collection),
              user_ids: [user.id],
              elements_filter: {
                sample: {
                  all: false,
                  included_ids: [s1.id, s2.id],
                  excluded_ids: []
                },
                reaction: {
                  all: false,
                  included_ids: [],
                  excluded_ids: []
                }
              }
            }
          }

          before do
            CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
            CollectionsSample.create!(collection_id: c2.id, sample_id: s2.id)
          end

          it 'creates no shared collection' do
            post '/api/v1/collections/shared', params

            c = Collection.find_by(label: 'My project with Musashi')
            expect(c).to be_nil
          end
        end
      end
    end
  end

  context 'no user logged in' do
    describe 'GET /api/v1/collections/roots' do
      it 'responds with 401 status code' do
        get '/api/v1/collections/roots'
        expect(response.status).to eq(401)
      end
    end

    describe 'GET /api/v1/collections/shared_roots' do
      it 'responds with 401 status code' do
        get '/api/v1/collections/shared_roots'
        expect(response.status).to eq(401)
      end
    end

    describe 'POST /api/v1/collections/shared' do
      let(:params) {
        {
          collection_attributes: attributes_for(:collection, label: 'New'),
          user_ids: [1],
          sample_ids: []
        }
      }

      it 'does not create a new collection' do
        post '/api/v1/collections/shared', params

        expect(response.status).to eq(401)

        c = Collection.find_by(label: 'New')
        expect(c).to be_nil
      end
    end
  end
end
