# frozen_string_literal: true

require 'rails_helper'

describe ElementDetailLevelCalculator do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:owned_collection) { create(:collection, user: user) }
  let(:other_users_unshared_collection) { create(:collection, user: other_user)}
  let(:other_users_shared_collection) do
    create(:collection, user: other_user).tap do |collection|
      create(
        :collection_share,
        collection: collection,
        shared_with: user,
        element_detail_level: 2,
        reaction_detail_level: 2,
        researchplan_detail_level: 2,
        sample_detail_level: 2,
        screen_detail_level: 2,
        wellplate_detail_level: 2,
        celllinesample_detail_level: 2,
        devicedescription_detail_level: 2
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
        expect(calculator.detail_levels.values.max).to be 2
      end
    end
  end
end
