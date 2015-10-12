require 'rails_helper'

describe Chemotion::CollectionAPI do
  let(:json_options) {
    {
      only: [:id, :label],
      methods: [:children, :descendant_ids, :permission_level, :shared_by_id, :sample_detail_level, :reaction_detail_level, :wellplate_detail_level, :screen_detail_level, :is_shared]
    }
  }

  context 'authorized user logged in' do
    let(:user)  { create(:user, first_name: 'Musashi', last_name: 'M') }
    let(:u2)    { create(:user) }
    let!(:c1)   { create(:collection, user: user, is_shared: false) }
    let!(:c2)   { create(:collection, user: user, shared_by_id: user.id, is_shared: true) }
    let!(:c3)   { create(:collection, is_shared: false) }
    let!(:c4)   { create(:collection, user: user, shared_by_id: u2.id, is_shared: true) }
    let!(:c5)   { create(:collection, shared_by_id: u2.id, is_shared: true) }

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/collections/take_ownership' do
      context 'with appropriate permissions' do
        let!(:c1) { create(:collection, user: user) }
        let(:s)   { create(:sample) }
        let(:r)   { create(:reaction) }
        let(:w)   { create(:wellplate) }
        let!(:c2) { create(:collection, user: user, is_shared: true, shared_by_id: u2.id, permission_level: 4, parent: c1) }

        describe 'take ownership of c1' do
          before { post "/api/v1/collections/take_ownership/#{c1.id}" }

          it 'is allowed' do
            expect(response.status).to eq 201
          end
        end

        describe 'take ownership of c2' do
          before do
            CollectionsSample.create!(sample: s, collection: c1)
            CollectionsSample.create!(sample: s, collection: c2)
            CollectionsReaction.create!(reaction: r, collection: c1)
            CollectionsReaction.create!(reaction: r, collection: c2)
            CollectionsWellplate.create!(wellplate: w, collection: c1)
            CollectionsWellplate.create!(wellplate: w, collection: c2)

            post "/api/v1/collections/take_ownership/#{c2.id}"
          end

          it 'is allowed' do
            expect(response.status).to eq 201
          end

          it 'makes c2 an unshared root collection of user' do
            c2.reload
            expect(c2.parent).to be_nil
            expect(c2.is_shared).to eq false
            expect(c2.shared_by_id).to be_nil
          end
        end
      end

      context 'with inappropriate permissions' do
        let(:u2)  { create(:user) }
        let!(:c1) { create(:collection, user: u2) }
        let!(:c2) { create(:collection, user: user, is_shared: true, permission_level: 3) }

        describe 'take ownership of c1' do
          before { post "/api/v1/collections/take_ownership/#{c1.id}" }

          it 'is not allowed' do
            expect(response.status).to eq 401
          end
        end

        describe 'take ownership of c2' do
          before { post "/api/v1/collections/take_ownership/#{c2.id}" }

          it 'is not allowed' do
            expect(response.status).to eq 401
          end
        end
      end
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

        expect(JSON.parse(response.body)['collections'].first['label']).to eq c4.label
      end
    end

    describe 'POST /api/v1/collections/unshared' do
      let(:params) {
        {
          label: 'test'
        }
      }

      it 'should be able to create new collections' do
        collection = Collection.find_by(label: 'test')
        expect(collection).to be_nil
        post '/api/v1/collections/unshared', params
        collection = Collection.find_by(label: 'test')
        expect(collection).to_not be_nil
      end
    end

    describe 'elements' do
      let(:s1) { create(:sample) }
      let(:s2) { create(:sample) }
      let(:r1) { create(:reaction) }
      let(:r2) { create(:reaction) }
      let(:w1) { create(:wellplate) }
      let(:w2) { create(:wellplate) }
      let(:sc1) { create(:screen) }

      let!(:params) {
        {
          ui_state: {
            sample: {
              all: true,
              included_ids: [],
              excluded_ids: []
            },
            reaction: {
              all: true,
              included_ids: [],
              excluded_ids: [r2.id]
            },
            wellplate: {
              all: nil,
              included_ids: [w1.id],
              excluded_ids: []
            },
            screen: {
              all: nil,
              included_ids: [sc1.id],
              excluded_ids: []
            },
            currentCollectionId: c1.id
          },
          collection_id: c2.id
        }
      }

      before do
        CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c1.id, sample_id: s2.id)
        CollectionsReaction.create!(collection_id: c1.id, reaction_id: r1.id)
        CollectionsReaction.create!(collection_id: c1.id, reaction_id: r2.id)
        CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w1.id)
        CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w2.id)
        CollectionsScreen.create!(collection_id: c1.id, screen_id: sc1.id)
        c1.reload
        c2.reload
      end

      describe 'PUT /api/v1/collections/elements' do
        it 'should be able to move elements between collections' do
          put '/api/v1/collections/elements', params
          c1.reload
          c2.reload
          expect(c1.samples).to match_array []
          expect(c1.reactions).to match_array [r2]
          expect(c1.wellplates).to match_array [w2]
          expect(c1.screens).to match_array []
          expect(c2.samples).to match_array [s1, s2]
          expect(c2.reactions).to match_array [r1]
          expect(c2.wellplates).to match_array [w1]
          expect(c2.screens).to match_array [sc1]
        end
      end

      describe 'POST /api/v1/collections/elements' do
        it 'should be able to assign elements to a collection' do
          post '/api/v1/collections/elements', params
          c1.reload
          c2.reload
          expect(c1.samples).to match_array [s1, s2]
          expect(c1.reactions).to match_array [r1, r2]
          expect(c1.wellplates).to match_array [w1, w2]
          expect(c1.screens).to match_array [sc1]
          expect(c2.samples).to match_array [s1, s2]
          expect(c2.reactions).to match_array [r1]
          expect(c2.wellplates).to match_array [w1]
          expect(c2.screens).to match_array [sc1]
        end
      end

      describe 'DELETE /api/v1/collections/elements' do
        it 'should be able to remove elements from a collection' do
          delete '/api/v1/collections/elements', params
          c1.reload
          expect(c1.samples).to match_array []
          expect(c1.reactions).to match_array [r2]
          expect(c1.wellplates).to match_array [w2]
          expect(c2.screens).to match_array []
        end
      end

    end

    describe 'PUT /api/v1/collections/shared/:id' do
      let(:params) {
        {
          permission_level: 13,
          sample_detail_level: 5,
          reaction_detail_level: 2,
          wellplate_detail_level: 1,
          screen_detail_level: 5
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
        expect(c2.screen_detail_level).to eq 5
      end
    end

    describe 'POST /api/v1/collections/shared' do
      describe 'sharing' do
        context 'with appropriate permissions' do
          let(:c1)  { create(:collection, user: user) }
          let(:c2)  { create(:collection, user: user, is_shared: true, permission_level: 2) }
          let(:s1)  { create(:sample) }
          let(:s2)  { create(:sample) }
          let(:r1)  { create(:reaction) }
          let(:r2)  { create(:reaction) }
          let(:w1)  { create(:wellplate) }
          let(:w2)  { create(:wellplate) }
          let(:sc1) { create(:screen) }
          let(:sc2) { create(:screen) }

          let!(:params) {
            {
              current_collection_id: nil,
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
                },
                screen: {
                  all: false,
                  included_ids: [sc1.id, sc2.id],
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
            CollectionsScreen.create!(collection_id: c1.id, screen_id: sc1.id)
            CollectionsScreen.create!(collection_id: c1.id, screen_id: sc2.id)

            post '/api/v1/collections/shared', params
          end

          it 'creates shared collection with given samples' do
            post '/api/v1/collections/shared', params

            # naming convention for shared collections
            c = Collection.find_by(label: 'My project with Musashi M')
            expect(c).to_not be_nil
            expect(c.user_id).to eq user.id
            expect(c.samples).to match_array [s1, s2]
            expect(c.reactions).to match_array [r1]
            expect(c.wellplates).to match_array [w1]
            expect(c.screens).to match_array [sc1, sc2]
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

            c = Collection.find_by(label: 'My project with Musashi M')
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
