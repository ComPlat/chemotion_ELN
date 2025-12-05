# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SuggestionAPI do
  let!(:user) { create(:person, first_name: 'tam', last_name: 'M') }
  let!(:collection) { create(:collection, user: user, is_shared: true, permission_level: 1, sample_detail_level: 10) }

  let(:params) do
    {
      collection_id: collection.id,
      query: query,
      is_sync: false,
    }
  end

  describe 'GET /api/v1/suggestions/cell_lines' do
    include_context 'api request authorization context'

    let(:material) { create(:cellline_material) }
    let(:cell_line) { create(:cellline_sample, collections: [collection], cellline_material: material) }
    let(:cell_line2) do
      create(:cellline_sample, name: 'search-example', collections: [collection], cellline_material: material)
    end
    let(:cell_line_without_col) { create(:cellline_sample, name: 'search-example', cellline_material: material) }

    before do
      cell_line
      cell_line2
      get '/api/v1/suggestions/cell_lines', params: params
    end

    context 'when search term matches one cell line by the material name' do
      let(:query) { 'name-001' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'suggestions should be returned' do
        expect(parsed_json_response['suggestions'].length).to be 1
        expect(parsed_json_response['suggestions'].first['name']).to eq 'name-001'
        expect(parsed_json_response['suggestions'].first['search_by_method']).to eq 'cell_line_material_name'
      end
    end

    context 'when search term matches one cell line by the sample name' do
      let(:query) { 'arch-examp' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'suggestions should be returned' do
        expect(parsed_json_response['suggestions'].length).to be 1
        expect(parsed_json_response['suggestions'].first['name']).to eq 'search-example'
        expect(parsed_json_response['suggestions'].first['search_by_method']).to eq 'cell_line_sample_name'
      end
    end
  end

  describe 'GET /api/v1/suggestions/all' do
    include_context 'api request authorization context'

    let(:sample) { create(:sample, name: 'search-example', collections: [collection]) }

    let(:material) { create(:cellline_material) }
    let(:cell_line) { create(:cellline_sample, collections: [collection], cellline_material: material) }
    let(:cell_line2) do
      create(:cellline_sample, name: 'search-example', collections: [collection], cellline_material: material)
    end

    let(:sbmm_sample_uniprot) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:uniprot_sbmm, systematic_name: 'Zoological Phenomenon Protein'),
        user: user,
        name: 'Test sample',
      )
    end
    let(:sbmm_sample_modified) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(
          :modified_uniprot_sbmm,
          systematic_name: 'Foobar test',
          ec_numbers: ['2.6.1.1'],
          parent: sbmm_sample_uniprot.sequence_based_macromolecule,
        ),
        user: user,
      )
    end

    before do
      sample
      cell_line
      cell_line2
      sbmm_sample_uniprot
      sbmm_sample_modified
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample_uniprot,
                                                          collection: collection)
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample_modified,
                                                          collection: collection)
      get '/api/v1/suggestions/all', params: params
    end

    context 'when search term matches sbmm samples by sample name or sbmm systematic name' do
      let(:query) { 'test' }

      it 'returns two sbmm sample suggestions' do
        expect(response.status).to be 200
        expect(parsed_json_response['suggestions'].length).to be 2
        search_by_methods = parsed_json_response['suggestions'].pluck('search_by_method')
        expect(search_by_methods).to include('sbmm_sample_name', 'sbmm_systematic_name')
      end
    end

    context 'when search term matches sbmm samples by sbmm ec numbers' do
      let(:query) { '2.6.' }

      it 'returns one sbmm sample suggestions' do
        expect(response.status).to be 200
        expect(parsed_json_response['suggestions'].length).to be 2
        search_by_methods = parsed_json_response['suggestions'].pluck('search_by_method')
        expect(search_by_methods).to include('sbmm_ec_numbers')
      end
    end

    context 'when search term matches two cell line samples with the same material name' do
      let(:query) { 'name-001' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'suggestions should be returned' do
        expect(parsed_json_response['suggestions'].length).to be 1
        expect(parsed_json_response['suggestions'].first['name']).to eq 'name-001'
        expect(parsed_json_response['suggestions'].first['search_by_method']).to eq 'cell_line_material_name'
      end
    end

    context 'when search term matches one cell line by the sample name' do
      let(:query) { 'arch-examp' }

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'two suggestions were found' do
        expect(parsed_json_response['suggestions'].length).to be 2
      end

      it 'first suggestion from sample' do
        expect(parsed_json_response['suggestions'].first['name']).to eq 'search-example'
        expect(parsed_json_response['suggestions'].first['search_by_method']).to eq 'sample_name'
      end

      it 'second suggestion from cell line' do
        expect(parsed_json_response['suggestions'].second['name']).to eq 'search-example'
        expect(parsed_json_response['suggestions'].second['search_by_method']).to eq 'cell_line_sample_name'
      end
    end
  end

  describe 'GET /api/v1/suggestions/samples' do
    include_context 'api request authorization context'
    context 'when searching for molecule name' do
      let(:sample) { create(:sample, name: 'search-example', collections: [collection]) }
      let(:molecule_name) { create(:molecule_name, molecule: sample.molecule) }
      let(:query) { 'Awesome' }

      before do
        sample.molecule_name_id = molecule_name.id
        sample.save
        get '/api/v1/suggestions/samples', params: params
      end

      it 'status code is success' do
        expect(response).to have_http_status(:success)
      end

      it 'one suggestion was found' do
        expect(parsed_json_response['suggestions'].length).to be 1
      end

      it 'suggestion from sample' do
        expect(parsed_json_response['suggestions'].first['name']).to eq 'Awesome Water'
        expect(parsed_json_response['suggestions'].first['search_by_method']).to eq 'molecule_name'
      end
    end
  end

  describe 'GET /api/v1/suggestions/sequence_based_macromolecule_samples' do
    include_context 'api request authorization context'

    context 'when searching for sequence based macromolecule samples' do
      let(:sbmm_sample_uniprot) do
        create(
          :sequence_based_macromolecule_sample,
          sequence_based_macromolecule: build(:uniprot_sbmm, systematic_name: 'Zoological Phenomenon Protein'),
          user: user,
          name: 'Test sample',
        )
      end
      let(:sbmm_sample_modified) do
        create(
          :sequence_based_macromolecule_sample,
          sequence_based_macromolecule: build(
            :modified_uniprot_sbmm,
            systematic_name: 'Foobar test',
            ec_numbers: ['2.6.1.1'],
            parent: sbmm_sample_uniprot.sequence_based_macromolecule,
          ),
          user: user,
        )
      end
      let(:query) { 'test' }

      before do
        sbmm_sample_uniprot
        sbmm_sample_modified
        CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample_uniprot,
                                                            collection: collection)
        CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample_modified,
                                                            collection: collection)
        get '/api/v1/suggestions/sequence_based_macromolecule_samples', params: params
      end

      it 'returns two sbmm sample suggestions' do
        expect(response.status).to be 200
        expect(parsed_json_response['suggestions'].length).to be 2
        search_by_methods = parsed_json_response['suggestions'].pluck('search_by_method')
        expect(search_by_methods).to include('sbmm_sample_name', 'sbmm_systematic_name')
      end
    end
  end

  context 'when user is authenticated' do
    include_context 'api request authorization context'
    let(:query) { 'query' }

    it 'returns suggestions object with the correct structure' do
      get '/api/v1/suggestions/all', params: params

      expect(response).to have_http_status(:success)
      expect(parsed_json_response.keys).to contain_exactly('suggestions')
      suggestions = parsed_json_response['suggestions']
      expect(suggestions).to be_an(Array)
    end
  end

  context 'when user is not authenticated' do
    let(:query) { 'query' }

    it 'returns unauthorized error' do
      get '/api/v1/suggestions/all', params: params

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
