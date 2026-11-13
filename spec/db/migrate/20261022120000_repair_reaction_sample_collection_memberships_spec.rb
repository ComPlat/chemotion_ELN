# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20261022120000_repair_reaction_sample_collection_memberships.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20261022120000: RepairReactionSampleCollectionMemberships' do
  let(:owner) { create(:person) }
  let(:collection) { create(:collection, user: owner) }
  let(:reaction) { create(:reaction, creator: owner, collections: [collection]) }
  let(:sample) { create(:sample, creator: owner, collections: [collection]) }

  it 'adds the missing membership of a reaction sample' do
    ReactionsPurificationSolventSample.create!(reaction: reaction, sample: sample)
    CollectionsSample.where(sample_id: sample.id, collection_id: collection.id).delete_all

    RepairReactionSampleCollectionMemberships.new.up

    expect(CollectionsSample.exists?(sample_id: sample.id, collection_id: collection.id)).to be true
  end
end
# rubocop:enable RSpec/DescribeClass
