# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Search::CollectionScope do
  subject(:scope) { described_class.new(user: user, collections: collections) }

  let(:user) { create(:person) }
  let(:owner) { create(:person) }
  let(:own_collection) { create(:collection, user: user) }
  let(:shared_collection) do
    create(:collection, user: owner).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user, sample_detail_level: 0,
                                reaction_detail_level: 2)
    end
  end
  let(:collections) { [own_collection, shared_collection] }

  describe '#relation_for' do
    let(:own_sample) { create(:sample, collections: [own_collection]) }
    let(:shared_sample) { create(:sample, collections: [shared_collection]) }
    let(:both_sample) { create(:sample, collections: [own_collection, shared_collection]) }
    let(:outside_sample) { create(:sample, collections: [create(:collection, user: owner)]) }

    before { [own_sample, shared_sample, both_sample, outside_sample] }

    it 'returns the records held in any collection of the scope, each once' do
      expect(scope.relation_for(Sample).pluck(:id)).to contain_exactly(own_sample.id, shared_sample.id, both_sample.id)
    end

    it 'leaves out soft-deleted memberships' do
      CollectionsSample.find_by(sample: shared_sample, collection: shared_collection).destroy

      expect(scope.relation_for(Sample)).not_to include(shared_sample)
    end

    it 'is empty for an empty scope' do
      expect(described_class.new(user: user, collections: []).relation_for(Sample)).to be_empty
    end

    it 'covers the generic elements and cell lines join tables' do
      expect(scope.relation_for(Labimotion::Element).to_sql).to include('collections_elements')
      expect(scope.relation_for(CelllineSample).to_sql).to include('collections_celllines')
    end

    it 'rejects a model that is not held in collections' do
      expect { scope.relation_for(Molecule) }.to raise_error(ArgumentError, /Molecule/)
    end
  end

  describe '#at_least' do
    it 'keeps the collections that grant the level' do
      expect(scope.at_least(:sample_detail_level, 1).ids).to contain_exactly(own_collection.id)
      expect(scope.at_least(:reaction_detail_level, 2).ids).to contain_exactly(own_collection.id, shared_collection.id)
    end

    it 'rejects an unknown level' do
      expect { scope.at_least(:bogus_detail_level, 1) }.to raise_error(ArgumentError, /bogus/)
    end
  end

  describe '#detail_levels' do
    it 'matches the collection levels for a single collection' do
      single = described_class.new(user: user, collections: [shared_collection])

      expect(single.detail_levels).to eq(shared_collection.detail_levels_for_user(user))
    end

    it 'takes the lowest level across several collections' do
      expect(scope.detail_levels).to include(sample_detail_level: 0, reaction_detail_level: 2)
    end

    it 'is keyed by class for the entities' do
      expect(scope.class_detail_levels).to include(Sample => 0, Reaction => 2)
    end
  end
end
