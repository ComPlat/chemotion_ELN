# frozen_string_literal: true

require 'rails_helper'

describe ElementDetailLevelCalculator do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:owned_collection) { create(:collection, user: user) }
  let(:other_users_unshared_collection) { create(:collection, user: other_user) }
  let(:other_users_shared_collection) do
    create(:collection, user: other_user).tap do |collection|
      create(
        :collection_share,
        collection: collection,
        shared_with: user,
        celllinesample_detail_level: 2,
        devicedescription_detail_level: 2,
        element_detail_level: 2,
        reaction_detail_level: 2,
        researchplan_detail_level: 2,
        sample_detail_level: 2,
        sequencebasedmacromoleculesample_detail_level: 2,
        screen_detail_level: 2,
        wellplate_detail_level: 2,
      )
    end
  end
  let(:element) { create(:sample, collections: element_collections) }
  let(:calculator) { described_class.new(user: user, element: element) }

  describe '#detail_levels' do
    context 'when user has no access to element' do
      let(:element_collections) { [other_users_unshared_collection] }

      it 'returns detail level 0' do
        expect(calculator.detail_levels.values.max).to be 0
      end
    end

    context 'when user owns a collection with the element' do
      let(:element_collections) { [owned_collection] }

      it 'returns a detail level of 10' do
        expect(calculator.detail_levels.values.max).to be 10
      end
    end

    context 'when element is in a collection shared with the user' do
      let(:element_collections) { [other_users_shared_collection] }

      it 'returns the configured detail levels' do
        expect(calculator.detail_levels.values.max).to eq 2
      end
    end
  end

  describe '.for_collection' do
    context 'when the collection is owned by the user' do
      it 'returns full access for every detail-level key' do
        result = described_class.for_collection(collection: owned_collection, user: user)
        expect(result[Sample]).to eq 10
        expect(result[Reaction]).to eq 10
        expect(result[Well]).to eq result[Wellplate]
      end
    end

    context 'when the collection is shared with the user' do
      it 'returns the configured detail levels, class-keyed' do
        result = described_class.for_collection(collection: other_users_shared_collection, user: user)
        expect(result[Sample]).to eq 2
        expect(result[Reaction]).to eq 2
        expect(result[Well]).to eq result[Wellplate]
      end
    end

    context 'when the collection is neither owned nor shared with the user' do
      it 'returns 0 for every detail-level key' do
        result = described_class.for_collection(collection: other_users_unshared_collection, user: user)
        expect(result.values.max).to eq 0
      end
    end
  end

  describe '.owned_levels' do
    it 'returns full access for every detail-level key, without needing a collection' do
      result = described_class.owned_levels
      expect(result[Sample]).to eq 10
      expect(result[Reaction]).to eq 10
      expect(result[Well]).to eq result[Wellplate]
    end
  end

  describe '.for_list' do
    context 'when collection is given' do
      it 'delegates to .for_collection regardless of owned_only' do
        result = described_class.for_list(collection: owned_collection, user: user, owned_only: true)
        expect(result).to eq described_class.for_collection(collection: owned_collection, user: user)
      end
    end

    context 'when collection is nil' do
      it 'delegates to .owned_levels when owned_only is true' do
        result = described_class.for_list(collection: nil, user: user, owned_only: true)
        expect(result).to eq described_class.owned_levels
      end

      it 'raises when owned_only is not true' do
        expect { described_class.for_list(collection: nil, user: user, owned_only: false) }
          .to raise_error(ArgumentError, /owner-only/)
      end
    end

    it 'requires the owned_only keyword' do
      expect { described_class.for_list(collection: owned_collection, user: user) }
        .to raise_error(ArgumentError, /owned_only/)
    end
  end
end
