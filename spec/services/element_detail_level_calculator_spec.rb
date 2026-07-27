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

    context 'when owns_collection_with_element is pre-computed' do
      let(:element_collections) { [owned_collection] }

      it 'trusts the pre-computed value over actual ownership' do
        calc = described_class.new(user: user, element: element, owns_collection_with_element: false)
        expect(calc.detail_levels.values.max).to eq 0
      end

      it 'matches the result of the per-element check when true' do
        precomputed = described_class.new(user: user, element: element, owns_collection_with_element: true)
        computed = described_class.new(user: user, element: element)
        expect(precomputed.detail_levels).to eq computed.detail_levels
      end
    end

    context 'when owns_collection_with_element is false but element is shared' do
      let(:element_collections) { [other_users_shared_collection] }

      it 'matches the result of the per-element check' do
        precomputed = described_class.new(user: user, element: element, owns_collection_with_element: false)
        computed = described_class.new(user: user, element: element)
        expect(precomputed.detail_levels).to eq computed.detail_levels
      end
    end
  end

  describe '.owned_element_ids' do
    context 'when elements is empty' do
      it 'returns an empty set without querying' do
        expect(described_class.owned_element_ids(elements: [], user: user)).to eq Set.new
      end
    end

    context 'with a mixed page of owned, shared, and unowned elements' do
      let(:page) do
        [
          create(:sample, collections: [owned_collection]),
          create(:sample, collections: [other_users_shared_collection]),
          create(:sample, collections: [other_users_unshared_collection]),
        ]
      end

      it 'returns only the ids of elements owned by the user' do
        result = described_class.owned_element_ids(elements: page, user: user)
        expect(result).to eq Set[page.first.id]
      end

      it 'matches the per-element user_collections_with_element.any? check for each element' do
        owned_ids = described_class.owned_element_ids(elements: page, user: user)

        page.each do |sample|
          per_element_result = sample.collections.where(user_id: user.group_ids + [user.id]).any?
          expect(owned_ids.include?(sample.id)).to eq per_element_result
        end
      end
    end

    context 'when an element belongs to a collection owned by the user via a group' do
      let(:group_sample) do
        group = create(:group, users: [user])
        create(:sample, collections: [create(:collection, user: group)])
      end

      it 'includes the element id' do
        result = described_class.owned_element_ids(elements: [group_sample], user: user)
        expect(result).to eq Set[group_sample.id]
      end
    end
  end
end
