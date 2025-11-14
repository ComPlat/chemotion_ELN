# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/IndexedLet, RSpec/MultipleMemoizedHelpers, RSpec/MultipleExpectations
describe Chemotion::CollectionElementsAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:checked_all) { false }

  let(:source_collection) { create(:collection, label: 'Source Collection', user: source_collection_user) }
  let(:target_collection) { create(:collection, label: 'Target Collection', user: target_collection_user) }
  let(:other_collection) { create(:collection, label: 'Other Collection', user: other_user) }

  let(:sample1) { create(:sample, name: 'Sample 1', creator: user, collections: [source_collection]) }
  let(:sample2) { create(:sample, name: 'Sample 2', creator: user, collections: [source_collection]) }
  let(:sample3) { create(:sample, name: 'Sample 3', creator: user, collections: [source_collection]) }

  let(:input) do
    {
      collection_id: target_collection.id,
      ui_state: {
        currentCollection: {
          id: 0, # the API does not actually use the current collection
        },
        sample: {
          checkedAll: checked_all,
          checkedIds: [sample1.id, sample2.id, sample3.id],
          uncheckedIds: [],
        },
      },
    }
  end

  context 'when assigning own elements to own collection' do
    let(:source_collection_user) { user }
    let(:target_collection_user) { user }

    it 'assigns the elements' do
      expect(sample1.collections).not_to include(target_collection)
      expect(sample2.collections).not_to include(target_collection)
      expect(sample3.collections).not_to include(target_collection)

      post '/api/v1/collection_elements', params: input
      [sample1, sample2, sample3].each(&:reload)

      expect(response.status).to eq 201
      expect(sample1.collections).to include(target_collection)
      expect(sample2.collections).to include(target_collection)
      expect(sample3.collections).to include(target_collection)
    end
  end

  context 'when assigning own elements to a shared collection' do
    let(:source_collection_user) { user }
    let(:target_collection_user) { other_user }

    it 'rejects the assignment if the target collections permission level is too low' do
      create(
        :collection_share,
        collection: target_collection,
        shared_with: user,
        permission_level: CollectionShare.permission_level(:import_elements) - 1,
      )

      expect(sample1.collections).not_to include(target_collection)
      expect(sample2.collections).not_to include(target_collection)
      expect(sample3.collections).not_to include(target_collection)

      post '/api/v1/collection_elements', params: input
      [sample1, sample2, sample3].each(&:reload)

      expect(response.status).to eq 403
    end

    it 'accepts the assignment if the target collections permission level is sufficient' do
      create(
        :collection_share,
        collection: target_collection,
        shared_with: user,
        permission_level: CollectionShare.permission_level(:import_elements),
      )

      expect(sample1.collections).not_to include(target_collection)
      expect(sample2.collections).not_to include(target_collection)
      expect(sample3.collections).not_to include(target_collection)

      post '/api/v1/collection_elements', params: input
      [sample1, sample2, sample3].each(&:reload)

      expect(response.status).to eq 201
      expect(sample1.collections).to include(target_collection)
      expect(sample2.collections).to include(target_collection)
      expect(sample3.collections).to include(target_collection)
    end
  end

  context 'when assigning elements from a shared collection to an owned collection' do
    let(:source_collection_user) { other_user }
    let(:target_collection_user) { user }

    it 'rejects the assignment if the permission level of the source_collection is not sufficient' do
      create(
        :collection_share,
        collection: source_collection,
        shared_with: user,
        permission_level: CollectionShare.permission_level(:share_collection) - 1,
      )

      expect(sample1.collections).not_to include(target_collection)
      expect(sample2.collections).not_to include(target_collection)
      expect(sample3.collections).not_to include(target_collection)

      post '/api/v1/collection_elements', params: input
      [sample1, sample2, sample3].each(&:reload)

      expect(response.status).to eq 403
    end

    it 'accepts the assignment if the permission level of the source_collection is sufficient' do
      create(
        :collection_share,
        collection: source_collection,
        shared_with: user,
        permission_level: CollectionShare.permission_level(:share_collection),
      )

      expect(sample1.collections).not_to include(target_collection)
      expect(sample2.collections).not_to include(target_collection)
      expect(sample3.collections).not_to include(target_collection)

      post '/api/v1/collection_elements', params: input
      [sample1, sample2, sample3].each(&:reload)

      expect(response.status).to eq 201
      expect(sample1.collections).to include(target_collection)
      expect(sample2.collections).to include(target_collection)
      expect(sample3.collections).to include(target_collection)
    end
  end

  context "when trying to assign elements you don't have access to" do
    let(:source_collection_user) { user }
    let(:target_collection_user) { user }
    let(:sample2) { create(:sample, name: 'Sample 2', creator: user, collections: [other_collection]) }

    it 'rejects the assignment' do
      expect(sample2.collections).not_to include(target_collection)

      post '/api/v1/collection_elements', params: input

      expect(response.status).to eq 403
    end
  end
end
# rubocop:enable RSpec/IndexedLet, RSpec/MultipleMemoizedHelpers, RSpec/MultipleExpectations
