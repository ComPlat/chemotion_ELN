# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Collections::TransferOwnership do
  let(:old_owner) { create(:person) }
  let(:new_owner) { create(:person) }
  let(:old_all) { Collection.get_all_collection_for_user(old_owner.id) }
  let(:new_all) { Collection.get_all_collection_for_user(new_owner.id) }
  let(:collection) { create(:collection, user: old_owner, label: 'Project X') }
  let(:offer) do
    create(:collection_share, collection: collection, shared_with: new_owner,
                              permission_level: CollectionShare.permission_level(:pass_ownership))
  end

  before { offer }

  def transfer
    described_class.new(new_owner).perform!(collection: collection)
  end

  describe 'the collection subtree' do
    let!(:child) { create(:collection, user: old_owner, parent: collection, label: 'sub') }

    it 'reassigns the collection and its descendants to the new owner' do
      transfer
      expect(collection.reload.user_id).to eq(new_owner.id)
      expect(child.reload.user_id).to eq(new_owner.id)
    end
  end

  describe 'the former owner' do
    it 'is demoted to a manage_shares sharee and the offer is consumed' do
      transfer
      shares = CollectionShare.where(collection: collection)
      expect(shares.where(shared_with_id: new_owner.id)).to be_empty
      expect(shares.find_by(shared_with_id: old_owner.id).permission_level)
        .to eq(CollectionShare.permission_level(:manage_shares))
    end
  end

  describe 'an element exclusive to the transferred collection' do
    let!(:sample) { create(:sample, creator: old_owner, collections: [old_all, collection]) }

    it "moves from the old owner's All to the new owner's All" do
      transfer
      cols = sample.reload.collections
      expect(cols.where(id: new_all.id)).to be_present
      expect(cols.where(id: old_all.id)).to be_empty
    end
  end

  describe 'an element also in another collection the old owner keeps' do
    let(:other) { create(:collection, user: old_owner, label: 'Y') }
    let!(:sample) { create(:sample, creator: old_owner, collections: [old_all, collection, other]) }

    it "stays in the old owner's All and is added to the new owner's All (dual-owned)" do
      transfer
      cols = sample.reload.collections
      expect(cols.where(id: old_all.id)).to be_present
      expect(cols.where(id: new_all.id)).to be_present
      expect(cols.where(id: other.id)).to be_present
    end
  end

  describe 'sub-collection shares on transfer (only where a matching share existed)' do
    let!(:shared_child) { create(:collection, user: old_owner, parent: collection, label: 'shared child') }
    let!(:plain_child) { create(:collection, user: old_owner, parent: collection, label: 'plain child') }

    # shared_child was already shared to the future new owner; plain_child was not.
    before do
      create(:collection_share, collection: shared_child, shared_with: new_owner,
                                permission_level: CollectionShare.permission_level(:add_elements))
    end

    it 'switches owner/sharee on a sub-collection that was already shared to the new owner' do
      transfer
      shares = CollectionShare.where(collection: shared_child)
      expect(shares.where(shared_with_id: new_owner.id)).to be_empty # S3: new owner's stale share dropped
      expect(shares.find_by(shared_with_id: old_owner.id)&.permission_level) # S1: former owner keeps access here
        .to eq(CollectionShare.permission_level(:manage_shares))
    end

    it 'leaves the former owner no share on a sub-collection that was not shared to the new owner' do
      transfer
      expect(plain_child.reload.user_id).to eq(new_owner.id) # still transferred to the new owner
      expect(CollectionShare.where(collection: plain_child, shared_with_id: old_owner.id)).to be_empty
    end
  end

  describe 'a moved sample still bound to a reaction the old owner keeps (S2 association guard)' do
    let(:other) { create(:collection, user: old_owner, label: 'Y') }
    let!(:reaction) { create(:reaction, creator: old_owner, collections: [old_all, other]) }
    let!(:sample) { create(:sample, creator: old_owner, collections: [old_all, collection]) }

    before { ReactionsReactantSample.create!(reaction: reaction, sample: sample, reference: false) }

    it "keeps the sample in the old owner's All (its reaction still lives there) while adding it to the new All" do
      transfer
      cols = sample.reload.collections
      expect(cols.where(id: old_all.id)).to be_present # filtered detach kept it — reaction still in old All
      expect(cols.where(id: new_all.id)).to be_present
    end
  end

  describe 'guards' do
    it 'refuses when the caller holds no offer' do
      CollectionShare.where(collection: collection, shared_with_id: new_owner.id).delete_all
      expect { transfer }.to raise_error(Usecases::Collections::Errors::InsufficientPermissionError)
    end

    it 'refuses to transfer a locked collection' do
      collection.update!(is_locked: true)
      expect { transfer }.to raise_error(Usecases::Collections::Errors::InsufficientPermissionError)
    end
  end
end
