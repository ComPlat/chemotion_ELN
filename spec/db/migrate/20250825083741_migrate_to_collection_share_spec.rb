# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20250825083741_migrate_to_collection_share.rb'
load 'db/migrate/20250827121248_remove_old_collection_tables_structure.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20250825083741: MigrateToCollectionShare' do
  # The final schema (db/schema.rb) has already dropped the pre-refactor `collections` columns and
  # the `sync_collections_users` table. Restore them around each example so the data migration has
  # the shape it reads, then tear them down again — mirrors
  # spec/db/migrate/20240709095242_rm_dup_collections_cellline_spec.rb toggling its indices.
  #
  # Deliberately per-example rather than per-context: the suite runs with
  # `use_transactional_fixtures = false` and DatabaseCleaner in :transaction mode, so this DDL is
  # rolled back with the cleaner's transaction. Hoisting it to before(:context) would run ~19 ALTERs
  # outside any transaction, and a crash between the two hooks would leave the schema wrong for
  # every later spec file in the process.
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

  # Pre-#2783 shape: a locked, is_shared "with <recipient>" collection owned by the recipient and
  # carrying the sharer in shared_by_id, with the shared collection as its child.
  def create_wrapper(sharer: owner, holder: recipient, label: 'with U2')
    create(:collection, user: holder, label: label, is_locked: true, is_shared: true, shared_by_id: sharer.id)
  end

  def group_for(user)
    Collection.find_by!(user_id: user.id, label: group_label)
  end

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

    it 'groups the shared-out collections under a single unlocked, top-level node' do
      groups = Collection.where(user_id: owner.id, label: group_label)
      expect(groups.count).to eq(1)
      expect(groups.first).to have_attributes(is_locked: false, ancestry: '/')
      expect([shared_a.reload.parent_id, shared_b.reload.parent_id]).to all(eq(group_for(owner).id))
    end

    it "places the group strictly last among all the owner's roots, locked ones included" do
      group = group_for(owner)
      siblings = Collection.where(user_id: owner.id, ancestry: '/').where.not(id: group.id)

      expect(group.position).to be > siblings.maximum(:position)
      expect(owner_root.reload.position).to eq(5)
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
      group = group_for(owner)

      expect(shared_parent.reload.parent_id).to eq(group.id)
      expect(child.reload.parent_id).to eq(shared_parent.id)
      expect(child.ancestry).to eq("/#{group.id}/#{shared_parent.id}/")
    end
  end

  describe 'legacy locked share wrappers (pre-#2783 data)' do
    let!(:wrapper) { create_wrapper }
    let!(:shared_child) do
      create(:collection, user: recipient, label: 'Shared A', parent: wrapper,
                          shared_by_id: owner.id, permission_level: 1)
    end

    it 'completes without tripping LockedCollectionGuard' do
      expect { MigrateToCollectionShare.new.up }.not_to raise_error
    end

    context 'when the migration has run' do
      before { MigrateToCollectionShare.new.up }

      it 'creates no CollectionShare for the contentless wrapper' do
        expect(CollectionShare.where(collection_id: wrapper.id)).to be_empty
      end

      it 'retires the emptied wrapper as a recoverable soft delete, bumping updated_at' do
        expect(Collection.exists?(wrapper.id)).to be(false)

        retired = Collection.only_deleted.find(wrapper.id)
        expect(retired.updated_at).to be_within(1.minute).of(Time.current)
      end

      it 'regroups the real child collection out from under the wrapper' do
        expect(shared_child.reload).to have_attributes(user_id: owner.id, parent_id: group_for(owner).id)
      end
    end

    context 'when a wrapper holds a collection the migration does not own' do
      # Legacy TakeOwnership nested the odd ordinary collection under a wrapper. It carries no
      # shared_by_id, so it is never swept, and it must not end up under the grouping node.
      let!(:stray) { create(:collection, user: recipient, label: 'Stray', parent: wrapper, position: 4) }

      before { MigrateToCollectionShare.new.up }

      it 'sends the stray back to its own root level instead of into the group' do
        expect(stray.reload).to have_attributes(ancestry: '/', user_id: recipient.id)
        expect(stray.parent_id).to be_nil
      end

      it 'gives the stray a position that does not collide at its new level' do
        positions = Collection.where(user_id: recipient.id, ancestry: '/').pluck(:position)

        expect(stray.reload.position).to be_present
        expect(positions).to eq(positions.uniq)
      end

      it 'retires the wrapper anyway, leaving no locked residue' do
        expect(Collection.only_deleted.exists?(wrapper.id)).to be(true)
        expect(Collection.where(is_locked: true, label: 'with U2')).to be_empty
      end
    end

    context 'when the only remaining child of a wrapper is soft-deleted' do
      let!(:deleted_child) do
        create(:collection, user: recipient, label: 'Gone', parent: wrapper,
                            shared_by_id: owner.id, permission_level: 1).tap(&:destroy)
      end

      before { MigrateToCollectionShare.new.up }

      it 'migrates it like a live one instead of leaving it under a retired wrapper' do
        restored = Collection.only_deleted.find(deleted_child.id)
        expect(restored).to have_attributes(user_id: owner.id, shared_by_id: nil, parent_id: group_for(owner).id)
      end

      it 'numbers it behind the live children so restoring it cannot collide' do
        live = Collection.where(ancestry: group_for(owner).child_ancestry).pluck(:position)
        deleted = Collection.only_deleted.find(deleted_child.id).position

        expect(deleted).to be > live.max
      end

      it 'gives it a CollectionShare that stays invisible until the collection is restored' do
        expect(CollectionShare.find_by(collection_id: deleted_child.id)).to be_present
        expect(Collection.shared_collections_for(recipient)).not_to include(deleted_child)

        Collection.only_deleted.find(deleted_child.id).restore
        expect(Collection.shared_collections_for(recipient).exists?(deleted_child.id)).to be(true)
      end
    end

    context 'when a wrapper holds elements directly' do
      let!(:sample) { create(:sample, creator: recipient) }

      before do
        CollectionsSample.create!(collection_id: wrapper.id, sample_id: sample.id)
        MigrateToCollectionShare.new.up
      end

      it 'unlocks it and leaves it with the user who put the elements there' do
        expect(wrapper.reload).to have_attributes(user_id: recipient.id, is_locked: false, shared_by_id: nil)
        expect(Collection.exists?(wrapper.id)).to be(true)
      end

      it 'keeps the element membership on it rather than moving it to another user' do
        expect(CollectionsSample.where(collection_id: wrapper.id, sample_id: sample.id)).to exist
        expect(CollectionsSample.where(collection_id: group_for(owner).id)).to be_empty
      end
    end
  end

  describe 'locked collections that are not share wrappers' do
    # is_locked alone also matches the per-user "All" / repository / "transferred" roots. One that
    # somehow carries shared_by_id must still be migrated — not silently stripped and retired.
    let!(:odd_one) do
      create(:collection, user: recipient, label: 'All', is_locked: true, is_shared: false,
                          shared_by_id: owner.id, permission_level: 1)
    end

    before { MigrateToCollectionShare.new.up }

    it 'shares and re-owns it in place, without moving or retiring it' do
      expect(odd_one.reload).to have_attributes(user_id: owner.id, shared_by_id: nil, ancestry: '/')
      expect(CollectionShare.find_by(collection_id: odd_one.id)).to have_attributes(shared_with_id: recipient.id)
      expect(Collection.exists?(odd_one.id)).to be(true)
    end
  end

  describe 'when the sharer has been soft-deleted' do
    let!(:shared) do
      create(:collection, user: recipient, label: 'Shared', shared_by_id: owner.id, permission_level: 1)
    end

    before do
      owner.destroy
      MigrateToCollectionShare.new.up
    end

    it 'still builds the grouping node and files the collection under it' do
      group = Collection.find_by!(user_id: owner.id, label: group_label)
      expect(shared.reload).to have_attributes(user_id: owner.id, parent_id: group.id)
    end
  end

  describe 'when the recipient has been soft-deleted' do
    let!(:shared) do
      create(:collection, user: recipient, label: 'Shared', shared_by_id: owner.id, permission_level: 1)
    end

    before do
      recipient.destroy
      MigrateToCollectionShare.new.up
    end

    it 'still records the share, so restoring the account restores its access' do
      expect(CollectionShare.find_by(collection_id: shared.id)).to have_attributes(shared_with_id: recipient.id)
    end
  end

  describe 'when the owner already has a non-root collection with the group label' do
    let!(:parent) { create(:collection, user: owner, label: 'Parent') }
    let!(:existing_group) { create(:collection, user: owner, label: group_label, parent: parent) }
    let!(:shared) do
      create(:collection, user: recipient, label: 'Shared', shared_by_id: owner.id, permission_level: 1)
    end

    before { MigrateToCollectionShare.new.up }

    it 'adopts it where it stands and still numbers its children' do
      expect(Collection.where(user_id: owner.id, label: group_label).count).to eq(1)
      expect(shared.reload.parent_id).to eq(existing_group.id)
      expect(shared.position).to eq(1)
    end

    it 'leaves the node where the user put it instead of dragging it back to the root' do
      expect(existing_group.reload.parent_id).to eq(parent.id)
    end
  end

  describe 'root positions' do
    let!(:positionless_root) { create(:collection, user: owner, label: 'Positionless root') }
    let!(:numbered_root) { create(:collection, user: owner, label: 'Numbered root', position: 5) }
    let!(:shared) do
      create(:collection, user: recipient, label: 'Shared', shared_by_id: owner.id, permission_level: 1)
    end

    before { MigrateToCollectionShare.new.up }

    it 'backfills the NULL positions and leaves the numbered ones alone' do
      expect(numbered_root.reload.position).to eq(5)
      expect(positionless_root.reload.position).to eq(6)
    end

    it 'leaves the locked system roots untouched' do
      expect(Collection.get_all_collection_for_user(owner.id).position).to eq(0)
    end

    it 'leaves no live unlocked root without a position' do
      expect(Collection.where(ancestry: '/', is_locked: false, position: nil)).to be_empty
    end

    it 'still lands the grouping node after every backfilled root' do
      expect(shared.reload.parent_id).to eq(group_for(owner).id)
      expect(group_for(owner).position).to be > positionless_root.reload.position
    end
  end

  describe 'root positions with a locked repository root' do
    let!(:repository_root) do
      create(:collection, user: owner, label: 'chemotion-repository.net', is_locked: true, position: 1)
    end
    let!(:positionless_root) { create(:collection, user: owner, label: 'Positionless root') }

    it 'starts after the locked roots rather than colliding with them' do
      MigrateToCollectionShare.new.up

      expect(positionless_root.reload.position).to be > repository_root.reload.position
    end
  end

  describe 'root positions on a nullable is_locked' do
    let!(:null_locked_root) do
      # rubocop:disable Rails/SkipsModelValidations
      create(:collection, user: owner, label: 'Null locked').tap { |c| c.update_columns(is_locked: nil) }
      # rubocop:enable Rails/SkipsModelValidations
    end

    it 'treats a NULL is_locked as unlocked and backfills it' do
      MigrateToCollectionShare.new.up

      expect(null_locked_root.reload.position).to be_present
    end
  end

  describe 'root positions that already collide' do
    let!(:first_root) { create(:collection, user: owner, label: 'First root', position: 3) }
    let!(:duplicate_root) { create(:collection, user: owner, label: 'Duplicate root', position: 3) }

    it 'leaves them alone: only NULLs are filled, nothing is renumbered' do
      MigrateToCollectionShare.new.up

      expect([first_root.reload.position, duplicate_root.reload.position]).to eq([3, 3])
    end
  end

  describe 'positions under the grouping node' do
    let!(:positionless_share) do
      create(:collection, user: recipient, label: 'Positionless share', shared_by_id: owner.id, permission_level: 1)
    end
    let!(:numbered_share) do
      create(:collection, user: recipient, label: 'Numbered share', position: 5,
                          shared_by_id: owner.id, permission_level: 1)
    end

    it 'numbers them from 1, numbered first and positionless after' do
      MigrateToCollectionShare.new.up

      expect(numbered_share.reload.position).to eq(1)
      expect(positionless_share.reload.position).to eq(2)
    end
  end

  describe 'when an unrelated user already has a collection with the grouping label' do
    let(:bystander) { create(:person) }
    let!(:lookalike) { create(:collection, user: bystander, label: group_label, position: 2) }
    let!(:lookalike_child) { create(:collection, user: bystander, label: 'Child', parent: lookalike, position: 7) }

    before do
      create(:collection, user: recipient, label: 'Shared', shared_by_id: owner.id, permission_level: 1)
    end

    it 'leaves it and its children exactly where they are' do
      MigrateToCollectionShare.new.up

      expect(lookalike.reload).to have_attributes(position: 2, ancestry: '/')
      expect(lookalike_child.reload.position).to eq(7)
    end

    context 'when that collection is locked' do
      before { lookalike.update_columns(is_locked: true) } # rubocop:disable Rails/SkipsModelValidations

      it 'does not try to reposition it, so the migration still completes' do
        expect { MigrateToCollectionShare.new.up }.not_to raise_error
        expect(lookalike.reload.position).to eq(2)
      end
    end
  end

  describe 'users the migration has nothing to do with' do
    let(:bystander) { create(:person) }
    let!(:bystander_roots) do
      [create(:collection, user: bystander, label: 'B1', position: 4),
       create(:collection, user: bystander, label: 'B2', position: 9)]
    end

    it 'does not touch a single one of their rows' do
      create(:collection, user: recipient, label: 'Shared', shared_by_id: owner.id, permission_level: 1)
      before_state = bystander_roots.map { |root| root.reload.attributes.slice('position', 'ancestry', 'updated_at') }

      MigrateToCollectionShare.new.up

      after_state = bystander_roots.map { |root| root.reload.attributes.slice('position', 'ancestry', 'updated_at') }
      expect(after_state).to eq(before_state)
    end
  end

  describe 'idempotency' do
    let!(:wrapper) { create_wrapper }
    let!(:shared_child) do
      create(:collection, user: recipient, label: 'Shared A', parent: wrapper,
                          shared_by_id: owner.id, permission_level: 1)
    end

    it 'changes nothing when the whole migration runs a second time' do
      MigrateToCollectionShare.new.up
      group = group_for(owner)
      state = Collection.with_deleted.order(:id).pluck(:id, :user_id, :ancestry, :position, :is_locked, :deleted_at)

      MigrateToCollectionShare.new.up

      expect(Collection.with_deleted.order(:id).pluck(:id, :user_id, :ancestry, :position, :is_locked,
                                                      :deleted_at)).to eq(state)
      expect(Collection.where(user_id: owner.id, label: group_label)).to contain_exactly(group)
      expect(CollectionShare.where(collection_id: shared_child.id).count).to eq(1)
    end
  end

  describe 'sync pass hardening (#3337 guards)' do
    let(:scu) { MigrateToCollectionShare::SyncCollectionsUser }
    let!(:synced_collection) { create(:collection, user: owner, label: 'Synced') }

    before do
      # valid sync share
      scu.new(collection_id: synced_collection.id, user_id: recipient.id,
              permission_level: 2, sample_detail_level: 4).save(validate: false)
      # orphans: null collection_id and a missing collection
      scu.new(collection_id: nil, user_id: recipient.id, permission_level: 0).save(validate: false)
      scu.new(collection_id: 2_000_000_000, user_id: recipient.id, permission_level: 0).save(validate: false)
    end

    it 'skips orphan rows without aborting, creating only the valid share' do
      expect { MigrateToCollectionShare.new.up }.not_to raise_error

      shares = CollectionShare.where(collection_id: synced_collection.id)
      expect(shares.pluck(:shared_with_id)).to contain_exactly(recipient.id)
      expect(shares.first).to have_attributes(permission_level: 2, sample_detail_level: 4)
    end

    it 'sets collections.shared to match EXISTS(collection_shares)' do
      MigrateToCollectionShare.new.up
      expect(synced_collection.reload.shared).to be(true)
    end

    it 'does not duplicate a sync share when the migration runs again' do
      MigrateToCollectionShare.new.up
      MigrateToCollectionShare.new.up

      expect(CollectionShare.where(collection_id: synced_collection.id).count).to eq(1)
    end
  end

  describe 'synchronized sub-collections stay visible to the owner' do
    # Pre-refactor, a synchronized collection was never re-owned or moved (unlike a directly
    # shared one) — the owner keeps it in place and recipients get access via
    # SyncCollectionsUser only. So unlike pass 1, pass 2 must NOT re-parent the collection:
    # doing so would be how an owner's synchronized sub-collection could silently vanish from
    # their own tree post-migration while still being reachable by the recipient.
    let(:scu) { MigrateToCollectionShare::SyncCollectionsUser }
    let!(:owner_parent) { create(:collection, user: owner, label: 'Owner parent') }
    let!(:synced_child) { create(:collection, user: owner, label: 'Synced child', parent: owner_parent) }

    before do
      scu.new(collection_id: synced_child.id, user_id: recipient.id, permission_level: 2).save(validate: false)
    end

    it "keeps the collection under the owner's tree, in its original place" do
      MigrateToCollectionShare.new.up

      expect(Collection.own_collections_for(owner)).to include(synced_child)
      expect(synced_child.reload).to have_attributes(user_id: owner.id, parent_id: owner_parent.id)
    end

    it 'also makes it visible to the recipient via a CollectionShare' do
      MigrateToCollectionShare.new.up

      expect(Collection.shared_collections_for(recipient)).to include(synced_child)
      expect(CollectionShare.find_by(collection_id: synced_child.id)).to have_attributes(
        shared_with_id: recipient.id, permission_level: 2,
      )
    end
  end
end
# rubocop:enable RSpec/DescribeClass
