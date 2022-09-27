# frozen_string_literal: true

require 'rails_helper'

describe ElementDetailLevelCalculator do
  let(:user) { create(:person) }

  describe '#element_detail_level' do
    subject { described_class.new(user: user, element: element).element_detail_level }

    context 'when user has no collection that contains the element' do
      let(:element) { create(:sample, collections: []) }

      it 'returns the minimum detail level' do
        expect(subject).to eq(0)
      end
    end

    context 'when user has unshared collection that contains the element' do
      let(:collection) { create(:collection, is_shared: false, user: user) }
      let(:element) { create(:sample, creator: user, collections: [collection]) }

      it 'returns the maximum detail level' do
        expect(subject).to eq(10)
      end
    end

    context 'when user has shared/synced collection that contains the element' do
      let(:other_user) { create(:person) }
      let(:other_user_collection) do
        create(
          :collection, is_shared: false, user: other_user, label: 'other_user_collection'
        )
      end

      let(:shared_collection) do
        create(
          :collection,
          is_shared: true, shared_by_id: other_user.id, user: user, label: 'shared_collection',
          sample_detail_level: 4
        )
      end

      let(:element) do
        create(:sample, creator: other_user, collections: [other_user_collection, shared_collection])
      end

      before do
        create(
          :sync_collections_user,
          user: user, sharer: other_user, collection: other_user_collection,
          sample_detail_level: 8
        )
      end

      it 'returns the maximum configured detail level for this element' do
        expect(subject).to eq(8)
      end
    end
  end

  describe '#nested_detail_levels' do
    let(:other_user) { create(:person) }
    let(:other_user_collection) do
      create(
        :collection, is_shared: false, user: other_user, label: 'other_user_collection'
      )
    end

    let(:shared_collection) do
      create(
        :collection,
        is_shared: true, shared_by_id: other_user.id, user: user, label: 'shared_collection',
        wellplate_detail_level: 9, researchplan_detail_level: 4, sample_detail_level: 3
      )
    end

    let(:element) { create(:research_plan) }

    subject { described_class.new(user: user, element: element).nested_detail_levels }

    before do
      create(
        :sync_collections_user,
        user: user, sharer: other_user, collection: other_user_collection,
        wellplate_detail_level: 6, researchplan_detail_level: 5, sample_detail_level: 7
      )
    end

    it 'returns a hash with matching keys' do
      expect(subject).to eq({ Sample => 0, Wellplate => 0, Well => 0, ResearchPlan => 0 })
    end

    context 'when user has shared/synced collection that contains the element' do
      let(:element) do
        create(:wellplate, collections: [other_user_collection, shared_collection])
      end

      it 'returns the configured detail level for wellplate' do
        expect(subject[Wellplate]).to eq(9)
      end
    end

    context 'when element is a Sample' do
      let(:element) do
        create(:sample, collections: [other_user_collection, shared_collection])
      end

      it 'returns maximum detail level configured in collections' do
        expect(subject[Sample]).to eq(7)
      end
    end
  end
end
