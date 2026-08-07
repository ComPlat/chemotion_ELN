# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20260709150000_renumber_collection_share_permission_levels.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20260709150000: RenumberCollectionSharePermissionLevels' do
  subject(:migration) { RenumberCollectionSharePermissionLevels.new }

  let(:owner) { create(:person) }

  # Writes a raw legacy level, bypassing the factory's (redesigned) default. update_column is the
  # point here: these rows are what a pre-migration database actually holds.
  def share_with_level(level)
    collection = create(:collection, user: owner)
    share = create(:collection_share, collection: collection, shared_with: create(:person))
    share.update_column(:permission_level, level) # rubocop:disable Rails/SkipsModelValidations
    share
  end

  describe '#up' do
    # legacy stored value => redesigned value
    {
      0 => 0, # read           -> read_elements
      1 => 2, # write          -> add_elements (legacy write could create; preserve that right)
      2 => 2, # share          -> add_elements (propagation is now bundled into add_elements)
      3 => 3, # delete         -> remove_elements
      4 => 3, # import         -> remove_elements (import implied delete)
      5 => 5, # pass ownership -> pass_ownership (frontend value)
      6 => 5, # pass ownership -> pass_ownership (post-#2783 backend value)
    }.each do |legacy, expected|
      it "maps legacy level #{legacy} to #{expected}" do
        share = share_with_level(legacy)

        migration.up

        expect(share.reload.permission_level).to eq(expected)
      end
    end

    it 'remaps every row in one pass, without cascading a value through the map twice' do
      shares = (0..6).map { |level| [level, share_with_level(level)] }

      migration.up

      expect(shares.map { |level, share| [level, share.reload.permission_level] })
        .to eq([[0, 0], [1, 2], [2, 2], [3, 3], [4, 3], [5, 5], [6, 5]])
    end

    it 'preserves the element-creation right of legacy write/share holders (they land at add_elements)' do
      write_share = share_with_level(1)
      share_share = share_with_level(2)

      migration.up

      add_elements = CollectionShare.permission_level(:add_elements)
      expect(write_share.reload.permission_level).to eq(add_elements)
      expect(share_share.reload.permission_level).to eq(add_elements)
    end

    it 'is idempotent — re-running does not shift already-migrated levels' do
      shares = (0..6).map { |level| share_with_level(level) }

      migration.up
      once = shares.map { |share| share.reload.permission_level }
      migration.up

      expect(shares.map { |share| share.reload.permission_level }).to eq(once)
    end

    it 'only ever produces levels that exist on the redesigned ladder' do
      (0..6).each { |level| share_with_level(level) }

      migration.up

      expect(CollectionShare.distinct.pluck(:permission_level))
        .to all(be_in(CollectionShare::PERMISSION_LEVELS.values))
    end

    it 'does nothing when there are no shares' do
      expect { migration.up }.not_to raise_error
    end
  end

  describe '#down' do
    {
      0 => 0, # read_elements   -> read
      1 => 1, # edit_elements   -> write
      2 => 2, # add_elements    -> share (non-over-granting legacy add rung; not import, which unlinked)
      3 => 3, # remove_elements -> delete
      4 => 4, # manage_shares   -> import (no legacy equivalent; highest non-ownership rung)
      5 => 6, # pass_ownership  -> the post-#2783 backend value
    }.each do |current, expected|
      it "maps level #{current} back to legacy #{expected}" do
        share = share_with_level(current)

        migration.down

        expect(share.reload.permission_level).to eq(expected)
      end
    end
  end
end
# rubocop:enable RSpec/DescribeClass
