# frozen_string_literal: true

require 'rails_helper'

describe ElementDetailLevelCalculator do
  let(:user) { create(:person) }

  describe '#detail_levels' do
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

    subject { described_class.new(user: user, element: element).detail_levels }

    before do
      create(
        :sync_collections_user,
        user: user, sharer: other_user, collection: other_user_collection,
        wellplate_detail_level: 6, researchplan_detail_level: 5, sample_detail_level: 7
      )
    end

    it 'returns a hash with matching keys' do
      expect(subject).to eq({
        Labimotion::Element => 0,
        Reaction => 0,
        ResearchPlan => 0,
        Sample => 0,
        Screen => 0,
        Well => 0,
        Wellplate => 0,
      })
    end

    context 'when user has shared/synced collection that contains the element' do
      let(:element) do
        create(:wellplate, collections: [other_user_collection, shared_collection])
      end

      it 'returns the highest configured detail level for the element' do
        expect(subject[Wellplate]).to eq(9)
      end
    end
  end
end
