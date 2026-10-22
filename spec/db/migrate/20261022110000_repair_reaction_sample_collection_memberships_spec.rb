# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20261022110000_repair_reaction_sample_collection_memberships.rb'

# rubocop:disable-next RSpec/DescribeClass
RSpec.describe 'migration 20261022110000: RepairReactionSampleCollectionMemberships' do
  let(:owner) { create(:person) }
  let(:collection) { create(:collection, user: owner) }
  let(:reaction) { create(:reaction, creator: owner, collections: [collection]) }
  # v3.x's sample factory always adds a collection of a default user; drop it.
  let(:sample) do
    create(:sample, creator: owner, collections: [collection]).tap do |s|
      CollectionsSample.where(sample_id: s.id).where.not(collection_id: collection.id).delete_all
    end
  end

  it 'adds the missing membership of a reaction sample' do
    ReactionsPurificationSolventSample.create!(reaction: reaction, sample: sample)
    CollectionsSample.where(sample_id: sample.id, collection_id: collection.id).delete_all

    RepairReactionSampleCollectionMemberships.new.up

    expect(CollectionsSample.exists?(sample_id: sample.id, collection_id: collection.id)).to be true
  end
end
