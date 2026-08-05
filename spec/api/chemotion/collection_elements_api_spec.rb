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
        permission_level: CollectionShare.permission_level(:add_elements) - 1,
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
        permission_level: CollectionShare.permission_level(:add_elements),
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
        permission_level: CollectionShare.permission_level(:add_elements) - 1,
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
        permission_level: CollectionShare.permission_level(:add_elements),
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

  context 'when removing own elements from an own collection' do
    let(:source_collection_user) { user }
    let(:remove_input) do
      {
        ui_state: {
          currentCollection: { id: 0 },
          sample: {
            checkedAll: false,
            checkedIds: [sample1.id, sample2.id, sample3.id],
            uncheckedIds: [],
          },
        },
      }
    end

    it 'responds 204 No Content with an empty body' do
      delete "/api/v1/collection_elements/#{source_collection.id}", params: remove_input, as: :json

      expect(response).to have_http_status(:no_content)
      expect(response.body).to be_blank
    end
  end

  # Regression: generic (labimotion) elements are keyed in ui_state by their ElementKlass name.
  # They must be resolved and (un)linked exactly like built-in elements; the resolution previously
  # used `find` instead of `find_by` and dereferenced a nil built-in class, so a generic-only
  # selection either no-op'd (payload dropped upstream) or raised.
  context 'with a generic (labimotion) element' do
    let(:source_collection_user) { user }
    let(:target_collection_user) { user }
    let(:element_klass) { create(:element_klass, name: 'my_generic') }
    let(:generic_element) do
      create(:element, element_klass: element_klass, creator: user, collections: [source_collection])
    end

    let(:generic_input) do
      {
        collection_id: target_collection.id,
        ui_state: {
          currentCollection: { id: 0 },
          'my_generic' => {
            checkedAll: false,
            checkedIds: [generic_element.id],
            uncheckedIds: [],
          },
        },
      }
    end

    it 'assigns the generic element to the target collection' do
      expect(generic_element.collections).not_to include(target_collection)

      post '/api/v1/collection_elements', params: generic_input
      generic_element.reload

      expect(response.status).to eq 201
      expect(generic_element.collections).to include(target_collection)
    end

    it 'removes the generic element from the source collection' do
      generic_element.collections << target_collection

      delete "/api/v1/collection_elements/#{source_collection.id}",
             params: generic_input.except(:collection_id), as: :json
      generic_element.reload

      expect(response).to have_http_status(:no_content)
      expect(generic_element.collections).not_to include(source_collection)
      expect(generic_element.collections).to include(target_collection)
    end
  end

  context 'when removing a sample connected to a reaction in the same collection' do
    let(:source_collection_user) { user }
    let(:reaction) { create(:reaction, samples: [sample1]) }
    let(:remove_input) do
      {
        ui_state: {
          currentCollection: { id: 0 },
          sample: {
            checkedAll: false,
            checkedIds: [sample1.id],
            uncheckedIds: [],
          },
        },
      }
    end

    before do
      CollectionsReaction.create!(collection_id: source_collection.id, reaction_id: reaction.id)
    end

    it 'keeps the sample and reports it as locked' do
      delete "/api/v1/collection_elements/#{source_collection.id}", params: remove_input, as: :json

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['locked_sample_ids']).to contain_exactly(sample1.id)
      expect(sample1.reload.collections).to include(source_collection)
    end

    context 'with a checkedAll selection' do
      let(:remove_input) do
        {
          ui_state: {
            currentCollection: { id: 0 },
            sample: { checkedAll: true, checkedIds: [], uncheckedIds: [] },
          },
        }
      end

      # Guards against the checkedAll id resolution falling back to every sample in the DB:
      # only the collection's own samples are touched, the reaction-linked one is reported locked.
      it 'removes the free samples but keeps and reports the reaction-linked one' do
        # sample2/sample3 are free samples in the collection alongside the reaction-linked sample1
        [sample2, sample3].each { |s| expect(source_collection.samples).to include(s) }

        delete "/api/v1/collection_elements/#{source_collection.id}", params: remove_input, as: :json

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['locked_sample_ids']).to contain_exactly(sample1.id)
        expect(source_collection.reload.samples).to contain_exactly(sample1)
      end
    end
  end

  context 'when removing a sample connected to a wellplate in the same collection' do
    let(:source_collection_user) { user }
    let(:wellplate) { create(:wellplate, samples: [sample1]) }
    let(:remove_input) do
      {
        ui_state: {
          currentCollection: { id: 0 },
          sample: {
            checkedAll: false,
            checkedIds: [sample1.id],
            uncheckedIds: [],
          },
        },
      }
    end

    before do
      CollectionsWellplate.create!(collection_id: source_collection.id, wellplate_id: wellplate.id)
    end

    # Not only reactions lock samples: a wellplate-linked sample must also be reported, not silently kept.
    it 'keeps the sample and reports it as locked' do
      delete "/api/v1/collection_elements/#{source_collection.id}", params: remove_input, as: :json

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['locked_sample_ids']).to contain_exactly(sample1.id)
      expect(sample1.reload.collections).to include(source_collection)
    end
  end

  # Regression: ui_state is processed sample-first, so the sample pass flags sample1 as locked while
  # reaction R is still present; the later reaction pass then removes R and cascades to sample1. The
  # locked set must be reconciled against final membership, or the user is falsely told the sample
  # could not be removed even though it was.
  context 'when removing a reaction together with its associated sample' do
    let(:source_collection_user) { user }
    let(:reaction) { create(:reaction, samples: [sample1]) }
    let(:remove_input) do
      {
        ui_state: {
          currentCollection: { id: 0 },
          sample: { checkedAll: false, checkedIds: [sample1.id], uncheckedIds: [] },
          reaction: { checkedAll: false, checkedIds: [reaction.id], uncheckedIds: [] },
        },
      }
    end

    before do
      CollectionsReaction.create!(collection_id: source_collection.id, reaction_id: reaction.id)
    end

    it 'removes both and does not falsely report the sample as locked' do
      delete "/api/v1/collection_elements/#{source_collection.id}", params: remove_input, as: :json

      expect(response).to have_http_status(:no_content)
      expect(source_collection.reload.samples).to be_empty
      expect(source_collection.reactions).to be_empty
    end
  end

  # Regression: removing only the wellplate cascades to its sample, which is still blocked by the
  # reaction. That kept id comes back from CollectionsWellplate#remove_in_collection (not the sample
  # pass), so it must not be discarded — otherwise the sample stays with no explanation.
  context 'when removing a wellplate whose sample is also locked by a reaction' do
    let(:source_collection_user) { user }
    let(:wellplate) { create(:wellplate, samples: [sample1]) }
    let(:reaction) { create(:reaction, samples: [sample1]) }
    let(:remove_input) do
      {
        ui_state: {
          currentCollection: { id: 0 },
          wellplate: { checkedAll: false, checkedIds: [wellplate.id], uncheckedIds: [] },
        },
      }
    end

    before do
      CollectionsWellplate.create!(collection_id: source_collection.id, wellplate_id: wellplate.id)
      CollectionsReaction.create!(collection_id: source_collection.id, reaction_id: reaction.id)
    end

    it 'reports the cascade-discovered locked sample instead of silently keeping it' do
      delete "/api/v1/collection_elements/#{source_collection.id}", params: remove_input, as: :json

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['locked_sample_ids']).to contain_exactly(sample1.id)
      expect(source_collection.reload.samples).to contain_exactly(sample1)
    end
  end
end
# rubocop:enable RSpec/IndexedLet, RSpec/MultipleMemoizedHelpers, RSpec/MultipleExpectations
