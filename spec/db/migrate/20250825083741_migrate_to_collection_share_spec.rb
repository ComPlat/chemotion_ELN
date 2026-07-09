# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20250825083741_migrate_to_collection_share.rb'
load 'db/migrate/20250827121248_remove_old_collection_tables_structure.rb'

# rubocop:disable RSpec/DescribeClass, RSpec/MultipleExpectations
RSpec.describe 'migration 20250825083741: MigrateToCollectionShare' do
  # The final schema (db/schema.rb) has already dropped the pre-refactor `collections` columns and
  # the `sync_collections_users` table. Restore them around each example so the data migration has
  # the shape it reads, then tear them down again — mirrors
  # spec/db/migrate/20240709095242_rm_dup_collections_cellline_spec.rb toggling its indices.
  before do
    RemoveOldCollectionTablesStructure.new.down
    reset_collection_schema_caches
  end

  after do
    RemoveOldCollectionTablesStructure.new.up
    reset_collection_schema_caches
  end

  def reset_collection_schema_caches
    Collection.reset_column_information
    CollectionShare.reset_column_information
    MigrateToCollectionShare::SyncCollectionsUser.reset_column_information
  end

  let(:group_label) { MigrateToCollectionShare::SHARED_OUT_GROUP_LABEL }
  let(:owner) { create(:person) }
  let(:recipient) { create(:person) }

  describe 'direct shares (pass 1) + regrouping' do
    let!(:owner_root) { create(:collection, user: owner, label: 'Owner root', position: 5) }
    let!(:shared_a) do
      create(:collection, user: recipient, label: 'Shared A', position: 1,
                          shared_by_id: owner.id, permission_level: 1, sample_detail_level: 7)
    end
    let!(:shared_b) do
      create(:collection, user: recipient, label: 'Shared B', position: 2,
                          shared_by_id: owner.id, permission_level: 3)
    end

    before { MigrateToCollectionShare.new.up }

    it 'creates a CollectionShare for the recipient with the collection permission/detail levels' do
      share = CollectionShare.find_by(collection_id: shared_a.id)
      expect(share).to have_attributes(shared_with_id: recipient.id, permission_level: 1, sample_detail_level: 7)
    end

    it 'transfers ownership back to the real owner and clears shared_by_id' do
      expect(shared_a.reload).to have_attributes(user_id: owner.id, shared_by_id: nil)
    end

    it 'groups the shared-out collections under a single unlocked, top-level node, positioned last' do
      groups = Collection.where(user_id: owner.id, label: group_label)
      expect(groups.count).to eq(1)

      group = groups.first
      expect(group).to have_attributes(is_locked: false, ancestry: '/')
      expect(group.position).to be > owner_root.reload.position
      expect([shared_a.reload.parent_id, shared_b.reload.parent_id]).to all(eq(group.id))
    end

    it 'sets the shared flag on the shared collections' do
      expect(shared_a.reload.shared).to be(true)
    end

    it 'keeps the collection visible to the recipient (owner-side regroup does not hide it)' do
      expect(Collection.shared_collections_for(recipient).exists?(shared_a.id)).to be(true)
    end
  end

  describe 'subtree preservation' do
    let!(:shared_parent) do
      create(:collection, user: recipient, label: 'Shared parent', shared_by_id: owner.id, permission_level: 1)
    end
    let!(:child) { create(:collection, user: recipient, label: 'Child', parent: shared_parent) }

    it 'moves the whole subtree under the group, keeping the child under its parent' do
      MigrateToCollectionShare.new.up
      group = Collection.find_by!(user_id: owner.id, label: group_label)

      expect(shared_parent.reload.parent_id).to eq(group.id)
      expect(child.reload.parent_id).to eq(shared_parent.id)
      expect(child.ancestry).to eq("/#{group.id}/#{shared_parent.id}/")
    end
  end

  describe 'idempotent regrouping (R1.4)' do
    let!(:shared_a) do
      create(:collection, user: recipient, label: 'Shared A', shared_by_id: owner.id, permission_level: 1)
    end

    it 'does not create a second node or re-parent when regrouping runs again' do
      MigrateToCollectionShare.new.up
      group = Collection.find_by!(user_id: owner.id, label: group_label)

      MigrateToCollectionShare.new.regroup_shared_out_collections(owner.id => [shared_a.id])

      expect(Collection.where(user_id: owner.id, label: group_label).count).to eq(1)
      expect(shared_a.reload.parent_id).to eq(group.id)
    end
  end

  describe 'sync pass hardening (#3337 guards)' do
    let(:scu) { MigrateToCollectionShare::SyncCollectionsUser }
    let!(:synced_collection) { create(:collection, user: owner, label: 'Synced') }
    let(:deleted_recipient) { create(:person) }

    before do
      # valid sync share
      scu.new(collection_id: synced_collection.id, user_id: recipient.id,
              permission_level: 2, sample_detail_level: 4).save(validate: false)
      # orphans: null collection_id and a missing collection
      scu.new(collection_id: nil, user_id: recipient.id, permission_level: 0).save(validate: false)
      scu.new(collection_id: 2_000_000_000, user_id: recipient.id, permission_level: 0).save(validate: false)
      # soft-deleted recipient (User acts_as_paranoid → User.exists? is false)
      scu.new(collection_id: synced_collection.id, user_id: deleted_recipient.id,
              permission_level: 0).save(validate: false)
      deleted_recipient.destroy
    end

    it 'skips orphan and deleted-recipient rows without aborting, creating only the valid share' do
      expect { MigrateToCollectionShare.new.up }.not_to raise_error

      shares = CollectionShare.where(collection_id: synced_collection.id)
      expect(shares.pluck(:shared_with_id)).to contain_exactly(recipient.id)
      expect(shares.first).to have_attributes(permission_level: 2, sample_detail_level: 4)
    end

    it 'sets collections.shared to match EXISTS(collection_shares)' do
      MigrateToCollectionShare.new.up
      expect(synced_collection.reload.shared).to be(true)
    end
  end
end
# rubocop:enable RSpec/DescribeClass, RSpec/MultipleExpectations
