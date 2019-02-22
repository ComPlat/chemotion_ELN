# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::CollectionAPI do
  subject {
    Class.new(Grape::API) { |inst|
      inst.extend(CollectionHelpers)
      inst.instance_eval { def user_ids(); end }
      inst.instance_eval { def current_user(); end }
    }
  }
  let(:p1) { create(:person) }
  let(:p2) { create(:person) }
  let(:g) { create(:group, users: [p1, p2]) }

  let(:c_sync) {
    create(:collection,
           user_id: p2.id, is_shared: false, is_synchronized: true)
  }
  let(:c_own) {
    create(:collection, user_id: p1.id, is_shared: false)
  }
  let(:c_shared) {
    create(
      :collection,
      user_id: p1.id, is_shared: true, shared_by_id: p2.id, permission_level: 1
    )
  }
  let(:c_shared_0) {
    create(
      :collection,
      user_id: p1.id, is_shared: true, shared_by_id: p2.id, permission_level: 0
    )
  }
  let(:c_group_shared) {
    create(
      :collection,
      user_id: g.id, is_shared: true, shared_by_id: p2.id, permission_level: 1
    )
  }
  let(:c_shared_by) {
    create(
      :collection,
      user_id: p2.id, is_shared: true, shared_by_id: p1.id, permission_level: 0
    )
  }
  let(:sync) {
    create(:sync_collections_user,
           user_id: p1.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 1)
  }
  let(:sync_g) {
    create(:sync_collections_user,
           user_id: g.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 1)
  }
  let(:sync_0) {
    create(:sync_collections_user,
           user_id: p1.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 0)
  }
  let(:sync_g_0) {
    create(:sync_collections_user,
           user_id: g.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 0)
  }

  let(:user_ids_) { [p1.id, g.id] }

  before do
    allow(subject).to receive(:user_ids) { user_ids_ }
    allow(subject).to receive(:current_user) { p1 }
  end

  describe 'fetch_collection_id_w_current_user to get collection id,' do
    it 'returns 0 if no collection found for user' do
      expect(
        subject.fetch_collection_id_w_current_user(c_sync.id)
      ).to eq(0)
    end
    it 'returns collection id if collection found for user' do
      expect(
        subject.fetch_collection_id_w_current_user(c_own.id)
      ).to eq(c_own.id)
    end
    it 'returns associated collection id of sync_coll if allowed for user' do
      expect(
        subject.fetch_collection_id_w_current_user(sync.id, true)
      ).to eq(c_sync.id)
      expect(
        subject.fetch_collection_id_w_current_user(sync_g.id, true)
      ).to eq(c_sync.id)
    end
  end

  describe 'fetch_collection_id_for_assign,' do
    it 'create a new collection and return its id with newCollection params' do
      expect(
        subject.fetch_collection_id_for_assign(newCollection: 'Hello Kitty')
      ).to eq(Collection.find_by(label: 'Hello Kitty')&.id)
    end
    it 'returns the assoc collection id (perm level >=1) w sync_to_me params' do
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync.id
        )
      ).to eq(c_sync.id)
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync_g.id
        )
      ).to eq(c_sync.id)
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync_0.id
        )
      ).to be nil
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync_g_0.id
        )
      ).to be nil
    end
    it 'returns the coll id if the coll is owned by or shared (w perm level >=1) to current user ' do
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_own.id)
      ).to eq(c_own.id)
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_shared.id)
      ).to eq(c_shared.id)
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_shared_0.id)
      ).to be nil
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_group_shared.id)
      ).to eq(c_group_shared.id)
    end
    it 'returns the coll id if the collection is shared by current user' do
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_shared_by.id)
      ).to eq(c_shared_by.id)
    end
  end
end
