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
    let!(:user)  { create(:person, first_name: 'Musashi', last_name: 'M') }
    let!(:u2)    { create(:person) }
    let(:group) { create(:group)}
    let!(:c1)   { create(:collection, user: user, is_shared: false) }

    let!(:root_u2) { create(:collection, user: user, shared_by_id: u2.id, is_shared: true, is_locked: true) }
    let!(:root_u) { create(:collection, user: u2, shared_by_id: user.id, is_shared: true, is_locked: true) }

    let!(:c2)   { create(:collection, user: u2, shared_by_id: user.id, is_shared: true, permission_level: 2, ancestry: root_u.id.to_s)}
    let!(:c3)   { create(:collection, user: user, is_shared: false) }
    let!(:c4)   { create(:collection, user: user, shared_by_id: u2.id, is_shared: true, ancestry: root_u2.id.to_s) }
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

    describe 'GET /api/v1/collections/shared_roots' do
      it 'returns serialized (shared) collection roots of logged in user' do
        get '/api/v1/collections/shared_roots'
        collections = JSON.parse(response.body)['collections']
        data2 = Entities::CollectionRootEntity.represent(c2, serializable: true).as_json
        data2.delete("shared_to")
        data2.delete("is_remoted")
        expect(collections.dig(0,'children', 0)).to include(data2)
      end
    end

    describe 'GET /api/v1/collections/remote_roots' do
      it 'returns serialized (remote) collection roots of logged in user' do
        get '/api/v1/collections/remote_roots'
        expect(
          JSON.parse(response.body).dig('collections',0,'children').map { |c| c['id'] }
          ).to include(c4.id)
      end
      context 'with a collection shared to a group' do
        let(:p2){ create(:person) }
        let!(:g1){ create(:group,users:[user]) }
        let!(:root_g) { create(
          :collection, user: user, shared_by_id: g1.id, is_shared: true, is_locked: true) }
        let!(:c6){ create(
          :collection, user: g1, is_shared: true,
          shared_by_id: p2.id, is_locked:false,
          ancestry: root_g.id.to_s
        )}

        before { get '/api/v1/collections/remote_roots' }
        it 'returns serialized (remote) collection roots of logged in user' do
          expect(
            JSON.parse(response.body)['collections'].map { |root|
              root['children'].map{ |e| e['id'] }
            }.flatten
          ).to match_array [c4.id, c6.id]
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
      let!(:c_source) { create(:collection, user: user) }
      let!(:c_target) { create(:collection, user_id: user.id) }
      let!(:c2_source) { create(:collection, user: u2) }
      let!(:c2_target) { create(:collection, user: u2) }
      let!(:c3_target) { create(:collection, user: u2, is_shared: true, shared_by_id: user.id) }
      let!(:c_shared_source_low) { create(:collection, user_id: user.id, shared_by_id: u2.id , is_shared: true, permission_level: 1) }
      let!(:c_shared_source_high) { create(:collection, user_id: user.id, shared_by_id: u2.id , is_shared: true, permission_level: 3) }
      let!(:c_shared_target) { create(:collection, user: user, shared_by_id: u2.id , is_shared: true) }
      let!(:c_sync_source) { create(:sync_collections_user, user: user, shared_by_id: u2.id, collection_id: c2_source) }
      let!(:c_sync_target) { create(:sync_collections_user, user: user, shared_by_id: u2.id, collection_id: c2_target) }
      let(:s) { create(:sample) }
      let(:s_r) { create(:sample) }
      let(:s_w) { create(:sample) }
      let(:s_w_s) { create(:sample) }
      let(:r_s) { create(:reaction, samples: [s_r]) }
      let(:w_s) { create(:wellplate, samples: [s_w]) }
      let(:w_s_s) { create(:wellplate, samples: [s_w_s]) }
      let(:sc) { create(:screen, wellplates: [w_s_s]) }
      let(:rp) { create(:research_plan)}

      let!(:ui_state) {
        {
          sample: { all: true },
          reaction: { all: true },
          wellplate: { all: true },
          screen: { all: true },
          research_plan: { all: true },
          currentCollection: {
            id: c_source.id,
            "is_shared": false,
            "is_synchronized": false,
          }
        }
      }

      let!(:ui_state_shared) {
        {
          currentCollection: {
            id: c3_target.id,
            is_shared: true,
          }
        }
      }

      let!(:ui_state_tweaked) {
        {
          currentCollection: {
            id: c2_source.id,
          }
        }
      }

      let!(:ui_state_shared_to_high) {
        {
          currentCollection: {
            id: c_shared_source_high.id,
            is_shared: true,
          }
        }
      }

      let!(:ui_state_shared_to_low) {
        {
          currentCollection: {
            id: c_shared_source_low.id,
            is_shared: true,
          }
        }
      }

      describe '01 - from and to collections owned by user, ' do
        # before do
        #   CollectionsSample.create!(collection_id: c_source.id, sample_id: s.id)
        #   CollectionsSample.create!(collection_id: c_source.id, sample_id: s_r.id)
        #   CollectionsSample.create!(collection_id: c_source.id, sample_id: s_w.id)
        #   CollectionsSample.create!(collection_id: c_source.id, sample_id: s_w_s.id)
        #   CollectionsReaction.create!(collection_id: c_source.id, reaction_id: r_s.id)
        #   CollectionsWellplate.create!(collection_id: c_source.id, wellplate_id: w_s.id)
        #   CollectionsWellplate.create!(collection_id: c_source.id, wellplate_id: w_s_s.id)
        #   CollectionsScreen.create!(collection_id: c_source.id, screen_id: sc.id)
        #   CollectionsResearchPlan.create!(collection_id: c_source.id, research_plan_id: rp.id)
        #   CollectionsSample.create!(collection_id: c_target.id, sample_id: s.id, deleted_at: Time.now)
        #   c_source.reload
        #   c_target.reload2
        # end
        describe 'PUT /api/v1/collections/elements' do
          it 'moves all elements and returns 204' do
            put '/api/v1/collections/elements', { ui_state: ui_state, collection_id: c_target.id }
            expect(response.status).to eq 204
          end
        end
        describe 'POST /api/v1/collections/elements' do
          it 'assigns elements to collection and returns 204' do
            post '/api/v1/collections/elements', { ui_state: ui_state, collection_id: c_target.id }
            expect(response.status).to eq 204
           end
        end
        describe 'DELETE /api/v1/collections/elements' do
          it 'removes elements from a collection and returns 204' do
            delete '/api/v1/collections/elements', { ui_state: ui_state }
            expect(response.status).to eq 204
          end
        end
      end

      describe '02 - from collection owned by user to collection shared by user, ' do
        describe 'PUT /api/v1/collections/elements to collection shared by user' do
          it 'moves all elements and returns 204' do
            put '/api/v1/collections/elements', { ui_state: ui_state, collection_id: c3_target.id }
            expect(response.status).to eq 204
          end
        end
        describe 'POST /api/v1/collections/elements to collection shared by user' do
          it 'assigns elements to collection and returns 204' do
            post '/api/v1/collections/elements', { ui_state: ui_state, collection_id: c3_target.id }
            expect(response.status).to eq 204
           end
        end
      end

      describe '03 - from collection shared by user, to collection owned by user, ' do
        describe 'PUT /api/v1/collections/elements from collection shared by user' do

          it 'moves all elements and returns 204' do
            put('/api/v1/collections/elements', { ui_state: ui_state_shared, collection_id: c_target.id })
            expect(response.status).to eq 204
          end
        end
        describe 'POST /api/v1/collections/elements from collection shared by user' do
          it 'assigns elements to collection and returns 204' do
            post '/api/v1/collections/elements', { ui_state: ui_state_shared, collection_id: c_target.id }
            expect(response.status).to eq 204
           end
        end
        describe 'DELETE /api/v1/collections/elements from collection shared by user' do
          it 'removes elements from a collection and returns 204' do
            delete '/api/v1/collections/elements', { ui_state: ui_state_shared }
            expect(response.status).to eq 204
          end
        end
      end

      describe '04 - from collection shared to user with high permission level (>3), to collection owned by user, ' do
        describe 'PUT /api/v1/collections/elements from collection shared by user' do
          it 'moves all elements and returns 204' do
            put '/api/v1/collections/elements', { ui_state: ui_state_shared_to_high, collection_id: c_target.id }
            expect(response.status).to eq 204
          end
        end
        describe 'POST /api/v1/collections/elements from collection shared by user' do
          it 'assigns elements to collection and returns 204' do
            post '/api/v1/collections/elements', { ui_state: ui_state_shared_to_high, collection_id: c_target.id }
            expect(response.status).to eq 204
           end
        end
        describe 'DELETE /api/v1/collections/elements from collection shared by user' do
          it 'removes elements from a collection and returns 204' do
            delete '/api/v1/collections/elements', { ui_state: ui_state_shared_to_high }
            expect(response.status).to eq 204
          end
        end
      end

      describe '05 - from collection shared to user with low permission level, to collection owned by user, ' do
        describe 'PUT /api/v1/collections/elements from collection shared by user' do
          it 'refuses with 401' do
            put '/api/v1/collections/elements', { ui_state: ui_state_shared_to_low, collection_id: c_target.id }
            expect(response.status).to eq 401
          end
        end
        describe 'POST /api/v1/collections/elements from collection shared by user' do
          it 'refuses with 401' do
            post '/api/v1/collections/elements', { ui_state: ui_state_shared_to_low, collection_id: c_target.id }
            expect(response.status).to eq 401
           end
        end
        describe 'DELETE /api/v1/collections/elements from collection shared by user' do
          it 'refuses with 401' do
            delete '/api/v1/collections/elements', { ui_state: ui_state_shared_to_low }
            expect(response.status).to eq 401
          end
        end
      end

      describe '06 - from unauthorized collections ()' do
        describe 'PUT /api/v1/collections/elements' do
          it 'refuses with 401' do
            put '/api/v1/collections/elements', { ui_state: ui_state_tweaked, collection_id: c_target.id }
            expect(response.status).to eq 401
          end
        end
        describe 'POST /api/v1/collections/elements' do
          it 'refuses with 401' do
            post '/api/v1/collections/elements', { ui_state: ui_state_tweaked, collection_id: c_target.id }
            expect(response.status).to eq 401
           end
        end
        describe 'DELETE /api/v1/collections/elements' do
          it 'refuses with 401' do
            delete '/api/v1/collections/elements', { ui_state: ui_state_tweaked }
            expect(response.status).to eq 401
          end
        end
      end

      describe '07 - to unauthorized collections ()' do
        describe 'PUT /api/v1/collections/elements' do
          it 'refuses with 401' do
            put '/api/v1/collections/elements', { ui_state: ui_state, collection_id: c2_target.id }
            expect(response.status).to eq 401
          end
        end
        describe 'POST /api/v1/collections/elements' do
          it 'refuses with 401' do
            post '/api/v1/collections/elements', { ui_state: ui_state, collection_id: c2_target.id }
            expect(response.status).to eq 401
           end
        end
      end
      # TODO from/to authorized sync/shared collection
      # TODO from All collection put and delete:   expect(response.status).to eq 401
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
