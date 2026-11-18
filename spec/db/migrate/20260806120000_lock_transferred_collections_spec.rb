# frozen_string_literal: true

require 'rails_helper'

load Rails.root.join('db/migrate/20260806120000_lock_transferred_collections.rb').to_s

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20260806120000: LockTransferredCollections' do
  let(:user) { create(:person) }
  # create_chemotion_public_collection already gives every Person a locked repository root; use it
  # rather than building a second one, so the fixtures match real data.
  let(:repository_root) do
    Collection.find_by!(user_id: user.id, label: 'chemotion-repository.net', is_locked: true)
  end

  describe 'a "transferred" collection already nested under the repository root' do
    let!(:transferred) do
      create(:collection, user: user, label: 'transferred', parent: repository_root)
    end

    it 'is locked in place' do
      LockTransferredCollections.new.up

      expect(transferred.reload).to have_attributes(is_locked: true, parent_id: repository_root.id)
    end
  end

  # A root-level collection with this label may be one that escaped the repository subtree or one
  # the user created themselves - the label is not reserved and nothing in the row distinguishes
  # them - so the migration reports it and touches nothing.
  describe 'a root-level "transferred" collection' do
    let!(:root_level) { create(:collection, user: user, label: 'transferred', position: 4) }

    it 'is left exactly as it is' do
      LockTransferredCollections.new.up

      expect(root_level.reload).to have_attributes(ancestry: '/', is_locked: false)
    end
  end

  describe 'a "transferred" collection whose is_locked is NULL' do
    let!(:null_locked) do
      create(:collection, user: user, label: 'transferred', parent: repository_root)
                         .tap { |c| c.update_column(:is_locked, nil) }
    end

    it 'is locked too - a NULL flag is as unlocked as a false one' do
      LockTransferredCollections.new.up

      expect(null_locked.reload.is_locked).to be(true)
    end
  end

  describe 'running twice' do
    let!(:transferred) do
      create(:collection, user: user, label: 'transferred', parent: repository_root)
    end

    it 'is idempotent' do
      LockTransferredCollections.new.up
      expect { LockTransferredCollections.new.up }.not_to raise_error

      expect(transferred.reload).to have_attributes(is_locked: true, parent_id: repository_root.id)
    end
  end

  describe 'a "transferred" collection outside the repository subtree' do
    let!(:other_parent) { create(:collection, user: user, label: 'Some project') }
    let!(:sub_collection) do
      create(:collection, user: user, label: 'transferred', parent: other_parent)
    end

    it 'is not locked' do
      LockTransferredCollections.new.up

      expect(sub_collection.reload).to have_attributes(is_locked: false, parent_id: other_parent.id)
    end
  end
end
# rubocop:enable RSpec/DescribeClass
