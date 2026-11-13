# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SearchAPI do
  subject(:do_request) { post '/api/v1/search/all', params: params, as: :json }

  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }
  let(:other_collection) { create(:collection, user: create(:person)) }
  let(:params) do
    {
      collection_id: collection.id,
      selection: { search_by_method: 'substring', name: 'Qzxvjk' },
      page: 1,
      per_page: 1,
    }
  end

  shared_examples 'collection-scoped material search responses' do
    before do
      matching_sample
      other_sample
    end

    it 'returns only the local sample when its material matches with a different id' do
      do_request

      expect(response).to have_http_status(:created)
      expect(parsed_json_response.fetch(result_key)).to include(
        'ids' => [matching_sample.id], 'totalElements' => 1, 'elements' => [include('id' => matching_sample.id)],
      )
    end

    it 'counts a sample matching both directly and through its material only once' do
      matching_sample.update!(name: 'Qzxvjk')
      do_request

      expect(response).to have_http_status(:created)
      expect(parsed_json_response.fetch(result_key)).to include(
        'ids' => [matching_sample.id], 'totalElements' => 1, 'elements' => [include('id' => matching_sample.id)],
      )
    end

    context 'when sample text search is restricted by the collection share' do
      let(:collection) { create(:collection, user: create(:person)) }

      before do
        create(:collection_share, collection: collection, shared_with: user, sample_detail_level: 0)
      end

      it 'returns empty material results' do
        do_request

        expect(response).to have_http_status(:created)
        expect(parsed_json_response.fetch(result_key)).to include('ids' => [], 'totalElements' => 0, 'elements' => [])
      end
    end
  end

  context 'when searching macromolecules' do
    let(:material) { create(:uniprot_sbmm, id: 10_000, systematic_name: 'Qzxvjk') }
    let(:matching_sample) do
      create(:sequence_based_macromolecule_sample, id: 20_000, sequence_based_macromolecule: material,
                                                   user: user, collections: [collection])
    end
    let(:other_sample) do
      create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: material,
                                                   user: other_collection.user, collections: [other_collection])
    end
    let(:result_key) { 'sequence_based_macromolecule_samples' }

    it_behaves_like 'collection-scoped material search responses'
  end

  context 'when searching cell-line materials' do
    let(:material) { create(:cellline_material, id: 10_000, name: 'Qzxvjk') }
    let(:matching_sample) do
      create(:cellline_sample, id: 20_000, cellline_material: material, creator: user, collections: [collection])
    end
    let(:other_sample) do
      create(:cellline_sample, cellline_material: material, creator: other_collection.user,
                               collections: [other_collection])
    end
    let(:result_key) { 'cell_lines' }

    it_behaves_like 'collection-scoped material search responses'
  end
end
