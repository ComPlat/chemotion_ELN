# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20260709140000_dedup_collection_shares.rb'
load 'db/migrate/20260709140001_add_unique_index_to_collection_shares.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20260709140000: DedupCollectionShares' do
  let(:collection) { create(:collection) }
  let(:other_collection) { create(:collection) }
  let(:recipient) { create(:person) }

  around do |example|
    AddUniqueIndexToCollectionShares.new.down
    example.run
    AddUniqueIndexToCollectionShares.new.up
  end

  context 'with duplicate (collection_id, shared_with_id) rows' do
    let!(:untouched) { create(:collection_share, collection: other_collection, shared_with: recipient) }

    before do
      create(:collection_share, collection: collection, shared_with: recipient,
                                permission_level: 0, sample_detail_level: 0)
      create(:collection_share, collection: collection, shared_with: recipient,
                                permission_level: 3, sample_detail_level: 10)
      DedupCollectionShares.new.up
    end

    it 'merges the duplicates into a single row per (collection_id, shared_with_id)' do
      shares = CollectionShare.where(collection_id: collection.id, shared_with_id: recipient.id)
      expect(shares.count).to eq(1)
    end

    it 'widens the surviving row to the most permissive value per column (MAX)' do
      share = CollectionShare.find_by(collection_id: collection.id, shared_with_id: recipient.id)
      expect(share).to have_attributes(permission_level: 3, sample_detail_level: 10)
    end

    it 'does not touch unrelated (collection_id, shared_with_id) pairs' do
      expect(CollectionShare.where(id: untouched.id)).to exist
    end

    it 'allows the unique index to be added afterwards without a uniqueness violation' do
      expect { AddUniqueIndexToCollectionShares.new.up }.not_to raise_error
      AddUniqueIndexToCollectionShares.new.down # keep `around` teardown idempotent
    end
  end

  context 'without duplicates' do
    let!(:share) { create(:collection_share, collection: collection, shared_with: recipient) }

    it 'is a no-op' do
      expect { DedupCollectionShares.new.up }.not_to change(CollectionShare, :count)
      expect(share.reload).to have_attributes(permission_level: share.permission_level)
    end
  end
end
# rubocop:enable RSpec/DescribeClass
