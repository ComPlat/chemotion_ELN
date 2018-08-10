require 'rails_helper'

describe Chemotion::CollectionAPI do
  let(:json_options) {
    {
      only: [:id, :label],
      methods: [
        :children, :descendant_ids, :permission_level, :shared_by_id,
        :sample_detail_level, :reaction_detail_level, :wellplate_detail_level,
        :screen_detail_level, :is_shared, :is_locked, :sync_collections_users,
        :shared_users, :is_synchronized, :is_remote, :shared_to
      ]
    }
  }

  context 'authorized user logged in' do
    let(:user)  { create(:person, first_name: 'Musashi', last_name: 'M') }
    let(:u2)    { create(:user) }
    let(:group) { create(:group)}
    let!(:c1)   { create(:collection, user: user, is_shared: false) }
    let!(:c2)   { create(:collection, user: user, shared_by_id: user.id, is_shared: true, permission_level: 1) }
    let!(:c3)   { create(:collection, user: user, is_shared: false) }
    let!(:c4)   { create(:collection, user: user, shared_by_id: u2.id, is_shared: true) }
    let!(:c5)   { create(:collection, shared_by_id: u2.id, is_shared: true) }
    # - - - - sync collection
    let!(:owner) { create(:user) }
    let!(:c_sync_ancestry) { create(:collection, user: user, shared_by_id: owner.id, is_shared: true, is_locked: true, is_synchronized: false) }
    let!(:c_sync_r) { create(:collection, user: owner, is_shared: false, is_locked: false, is_synchronized: false) }
    let!(:c_sync_w) { create(:collection, user: owner, is_shared: false, is_locked: false, is_synchronized: false) }
    let!(:sc_r) { create(:sync_collections_user, collection_id: c_sync_r.id, user_id: user.id, permission_level: 0, shared_by_id: owner.id, fake_ancestry: c_sync_ancestry.id.to_s)}
    let!(:sc_w) { create(:sync_collections_user, collection_id: c_sync_w.id, user_id: user.id, permission_level: 1, shared_by_id: owner.id, fake_ancestry: c_sync_ancestry.id.to_s)}

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/collections/take_ownership' do
      context 'with appropriate permissions' do
        let!(:c1) { create(:collection, user: user) }
        let(:s)   { create(:sample) }
        let(:r)   { create(:reaction) }
        let(:w)   { create(:wellplate) }
        let!(:c2) {
          create(:collection, user: user,
          is_shared: true, shared_by_id: u2.id,
          permission_level: 5, parent: c1)
        }

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
        let!(:c2) {
          create(:collection, user: user,
          is_shared: true, permission_level: 3)
        }

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
        collections = JSON.parse(response.body)['collections']
        data1 = Entities::CollectionRootEntity.represent(c1, serializable: true).as_json
        data2 = Entities::CollectionRootEntity.represent(c3, serializable: true).as_json
        expect(collections).to eq [data1,data2]
      end
    end

    describe 'GET /api/v1/collections/locked' do
      it 'returns serialized locked unshared collection roots of logged in user' do
        get '/api/v1/collections/locked'
        expect(JSON.parse(response.body)['collections'].map{ |coll| coll["label"]})
          .to eq ["All","chemotion.net"]
      end
    end

    describe 'GET /api/v1/collections/shared_roots', skip: true do
      it 'returns serialized (shared) collection roots of logged in user' do
        get '/api/v1/collections/shared_roots'
        collections = JSON.parse(response.body)['collections']

        collections.map{|c| c['shared_to'] = nil}
        collections.map{|c| c['shared_by'] = nil}
        collections.map{|c| c['is_remoted'] = nil}
        # shared_to = collections.map{|c| c.delete("shared_to")}
        # shared_by = collections.map{|c| c.delete("shared_by")}
        # is_remote = collections.map{|c| c.delete("is_remote")}

        data2 = Entities::CollectionRootEntity.represent(c2, serializable: true).as_json
        expect(collections).to eq [data2]
      end
    end


    describe 'GET /api/v1/collections/remote_roots' do
      it 'returns serialized (remote) collection roots of logged in user', skip: true do
        get '/api/v1/collections/remote_roots'
        expect(JSON.parse(response.body)['collections'].select{ |dt| dt['is_locked'] == false }.first['label']).to eq c4.label

         collections = JSON.parse(response.body)['collections']
      end
      context 'with a collection shared to a group' do
        let(:p2){ create(:person) }
        let!(:g1){ create(:group,users:[user]) }
        let!(:c6){ create(
          :collection, user: g1, is_shared: true,
          shared_by_id: p2.id, is_locked:false
        )}

        before {get '/api/v1/collections/remote_roots'}
        it 'returns serialized (remote) collection roots of logged in user', skip: true do
          # create(:collection, user: user, shared_by_id: u2.id, is_shared: true, ancestry: c4.id)
          # create(:collection, user: user, shared_by_id: u2.id, is_shared: true, ancestry: c6.id)
          serialized = JSON.parse(response.body)['collections'].map{ |e| e['id']}
          expect(serialized).to match_array [c4.id, c6.id, c_sync_ancestry.id]
        end
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
      let(:rp1) { create(:research_plan) }

      let!(:ui_state) {
         {
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
            research_plan: {
              all: nil,
              included_ids: [rp1.id],
              excluded_ids: []
            },
            currentCollection: {
              id:c1.id
            }
          }
      }

      let!(:params) {
        {
          ui_state: ui_state,
          collection_id: c3.id,
        }
      }

      let!(:params_shared) {
        {
          ui_state: ui_state,
          collection_id: c2.id,
        }
      }

      let!(:params_sync_read) {
        {
          ui_state: ui_state,
          collection_id: sc_r.id,
          is_sync_to_me: true
        }
      }

      let!(:params_sync_write) {
        {
          ui_state: ui_state,
          collection_id: sc_w.id,
          is_sync_to_me: true
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
        CollectionsResearchPlan.create!(collection_id: c1.id, research_plan_id: rp1.id)
        c1.reload
        c2.reload
      end

      describe 'PUT /api/v1/collections/elements' do
        it 'should be able to move elements between unshared collections' do
          put '/api/v1/collections/elements', params
          c1.reload
          c3.reload
          expect(c1.samples).to match_array []
          expect(c1.reactions).to match_array [r2]
          expect(c1.wellplates).to match_array [w2]
          expect(c1.screens).to match_array []
          expect(c3.samples).to match_array [s1, s2]
          expect(c3.reactions).to match_array [r1]
          expect(c3.wellplates).to match_array [w1]
          expect(c3.screens).to match_array [sc1]
          expect(c3.research_plans).to match_array [rp1]
        end
        it 'should not be able to move elements to a shared collection' do
          put '/api/v1/collections/elements', params_shared
          c1.reload
          c2.reload
          expect(c2.samples).to match_array []
          expect(c2.reactions).to match_array []
          expect(c2.wellplates).to match_array []
          expect(c2.screens).to match_array []
          expect(c1.samples).to match_array [s1, s2]
          expect(c1.reactions).to match_array [r1, r2]
          expect(c1.wellplates).to match_array [w1, w2]
          expect(c1.screens).to match_array [sc1]
        end
      end

      describe 'POST /api/v1/collections/elements' do
        it 'should be able to assign elements to an unshared collection' do
          post '/api/v1/collections/elements', params
          File.write('error.html', response.body)
          c1.reload
          c3.reload
          expect(c1.samples).to match_array [s1, s2]
          expect(c1.reactions).to match_array [r1, r2]
          expect(c1.wellplates).to match_array [w1, w2]
          expect(c1.screens).to match_array [sc1]
          expect(c3.samples).to match_array [s1, s2]
          expect(c3.reactions).to match_array [r1]
          expect(c3.wellplates).to match_array [w1]
          expect(c3.screens).to match_array [sc1]
          expect(c3.research_plans).to match_array [rp1]
        end
        it 'should be able to assign elements to a shared collection' do
          post('/api/v1/collections/elements', params_shared.to_json, 'CONTENT_TYPE' => 'application/json')
          c1.reload
          c2.reload
          expect(c1.samples).to match_array [s1, s2]
          expect(c1.reactions).to match_array [r1, r2]
          expect(c1.wellplates).to match_array [w1, w2]
          expect(c1.screens).to match_array [sc1]
          expect(c1.research_plans).to match_array [rp1]
          expect(c2.samples).to match_array [s1, s2]
          expect(c2.reactions).to match_array [r1]
          expect(c2.wellplates).to match_array [w1]
          expect(c2.screens).to match_array [sc1]
          expect(c2.research_plans).to match_array [rp1]
        end
        it 'assign elements to a `writable` sync collection' do
          post '/api/v1/collections/elements', params_sync_write
          c1.reload
          c_sync_w.reload
          expect(c1.samples).to match_array [s1, s2]
          expect(c1.reactions).to match_array [r1, r2]
          expect(c1.wellplates).to match_array [w1, w2]
          expect(c1.screens).to match_array [sc1]
          expect(c1.research_plans).to match_array [rp1]
          expect(c_sync_w.samples).to match_array [s1, s2]
          expect(c_sync_w.reactions).to match_array [r1]
          expect(c_sync_w.wellplates).to match_array [w1]
          expect(c_sync_w.screens).to match_array [sc1]
          expect(c_sync_w.research_plans).to match_array [rp1]
        end
        it 'can not assign elements to a `readable` sync collection' do
          post '/api/v1/collections/elements', params_sync_read
          c1.reload
          c_sync_r.reload
          expect(c1.samples).to match_array [s1, s2]
          expect(c1.reactions).to match_array [r1, r2]
          expect(c1.wellplates).to match_array [w1, w2]
          expect(c1.screens).to match_array [sc1]
          expect(c1.research_plans).to match_array [rp1]
          expect(c_sync_r.samples).to match_array []
          expect(c_sync_r.reactions).to match_array []
          expect(c_sync_r.wellplates).to match_array []
          expect(c_sync_r.screens).to match_array []
          expect(c_sync_r.research_plans).to match_array []
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
          expect(c2.research_plans).to match_array []
        end
      end

    end

    describe 'PUT /api/v1/collections/shared/:id' do
      let(:params) {
        {collection_attributes: {
            permission_level: 13,
            sample_detail_level: 5,
            reaction_detail_level: 2,
            wellplate_detail_level: 1,
            screen_detail_level: 5
          }
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
          let(:s1)  { create(:sample, collections: [c1]) }
          let(:s2)  { create(:sample, collections: [c1]) }
          let(:s3)  { create(:sample, collections: [c1]) }
          let!(:r1)  { create(:reaction, collections: [c1], samples: [s3]) }
          let(:w1)  { create(:wellplate, collections: [c1]) }
          let(:sc1) { create(:screen, collections: [c1]) }

          let!(:params) {
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
          }

          it 'creates shared collection with given samples' do
            post '/api/v1/collections/shared', params.to_json, 'CONTENT_TYPE' => 'application/json'
            # naming convention for shared collections
            c = Collection.where(is_shared: true, user_id: u2.id, shared_by_id: user.id)
              .where("label LIKE 'My project with%'").first
            expect(c).to_not be_nil
            expect(c.samples).to match_array [s1, s3]
            expect(c.reactions).to match_array [r1]
            expect(c.wellplates).to match_array [w1]
            expect(c.screens).to match_array []
          end
        end

        context 'with inappropriate permissions' do
          let(:c1) { create(:collection, user: user, is_shared: true, permission_level: 1) }
          let(:s1) { create(:sample, collections: [c1]) }

          let!(:params) {
            {
              currentCollection: { id: c1.id },
              collection_attributes: attributes_for(:collection),
              user_ids: [u2.id],
              elements_filter: {
                sample: {
                  all: true,
                  included_ids: [s1.id],
                  excluded_ids: [],
                  collection_id: c1.id
                },
                reaction: {},
                wellplate: {},
                screen: {},
                research_plan: {},
              }
            }
          }

          it 'creates no shared collection' do
            post '/api/v1/collections/shared', params.to_json, 'CONTENT_TYPE' => 'application/json'
            expect(Collection.where(is_shared: true, user_id: u2.id, shared_by_id: user.id)
              .where("label LIKE 'My project with%'").first).to be_nil
          end
        end
      end
    end
  end

  context 'no user logged in' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(nil)
    end

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
