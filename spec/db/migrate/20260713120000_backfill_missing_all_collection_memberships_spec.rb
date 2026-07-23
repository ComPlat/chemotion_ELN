# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20260713120000_backfill_missing_all_collection_memberships.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20260713120000: BackfillMissingAllCollectionMemberships' do
  let(:owner) { create(:person) }
  let(:all_collection) { Collection.get_all_collection_for_user(owner.id) }
  let(:sub) { create(:collection, user: owner, label: 'sub') }
  let!(:sample) { create(:sample, creator: owner, collections: [sub]) }

  def membership_exists?
    CollectionsSample.exists?(sample_id: sample.id, collection_id: all_collection.id)
  end

  it 'inserts the missing (element, owner-All) membership' do
    all_collection # ensure the "All" collection exists
    expect(membership_exists?).to be false

    described_class_constant.new.up

    expect(membership_exists?).to be true
  end

  it 'is idempotent' do
    described_class_constant.new.up
    expect { described_class_constant.new.up }
      .not_to(change { CollectionsSample.where(sample_id: sample.id, collection_id: all_collection.id).count })
  end

  it 'leaves an element already present in All untouched' do
    CollectionsSample.create!(sample: sample, collection: all_collection)

    expect { described_class_constant.new.up }.not_to change(CollectionsSample, :count)
  end

  def described_class_constant
    BackfillMissingAllCollectionMemberships
  end
end
# rubocop:enable RSpec/DescribeClass
