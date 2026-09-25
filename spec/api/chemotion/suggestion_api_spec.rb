# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SuggestionAPI do
  let!(:user) { create(:person, first_name: 'tam', last_name: 'M') }
  let(:collection) { create(:collection, user: user) }
  let(:material) { create(:cellline_material) }
  let!(:sample) { create(:sample, name: 'search-example', collections: [collection]) }
  let(:query) { 'query' }
  let(:json_response) { JSON.parse(response.body) }
  let(:params) do
    {
      collection_id: collection.id,
      query: query,
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

  # rubocop:disable RSpec/MultipleMemoizedHelpers
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
    let(:device_description) do
      create(
        :device_description, :with_ontologies, name: 'test device description',
                                               vendor_device_name: 'test device name', creator: user
      )
    end
    let(:search_by_methods) { parsed_json_response['suggestions'].pluck('search_by_method') }

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
      CollectionsDeviceDescription.create!(device_description: device_description, collection: collection)
      get '/api/v1/suggestions/all', params: params
    end

    context 'when search term matches sbmm samples by sample name or sbmm systematic name' do
      let(:query) { 'test' }

      it 'returns two sbmm sample suggestions' do
        expect(response.status).to be 200
        expect(search_by_methods.count { |s| s.start_with?('sbmm') }).to be 2
        expect(search_by_methods).to include('sbmm_sample_name', 'sbmm_systematic_name')
      end
    end

    context 'when search term matches sbmm samples by sbmm ec numbers' do
      let(:query) { '2.6.' }

      it 'returns one sbmm sample suggestions' do
        expect(response.status).to be 200
        expect(search_by_methods.count { |s| s.start_with?('sbmm') }).to be 2
        expect(search_by_methods).to include('sbmm_ec_numbers')
      end
    end

    context 'when search term matches device descriptions by device description name' do
      let(:query) { 'test' }

      it 'returns two device description suggestions' do
        expect(response.status).to be 200
        expect(search_by_methods.count { |s| s.start_with?('device_description') }).to be 2
        search_by_methods = parsed_json_response['suggestions'].pluck('search_by_method')
        expect(search_by_methods).to include('device_description_name', 'device_description_vendor_device_name')
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
  # rubocop:enable RSpec/MultipleMemoizedHelpers

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

    # set_var resolves the detail levels. It used to consult only the user's *direct* share, so a
    # collection reaching them through a group fell back to sample_detail_level 0 and every
    # `dl_s.positive?` suggestion was skipped.
    context 'when the collection is shared through one of the users groups' do
      let(:other_user) { create(:person) }
      let(:group) { create(:group, users: [user]) }
      let(:collection) { create(:collection, user: other_user) }
      let(:sample) { create(:sample, name: 'search-example', collections: [collection]) }
      let(:molecule_name) { create(:molecule_name, molecule: sample.molecule) }
      let(:query) { 'Awesome' }

      before do
        create(:collection_share, collection: collection, shared_with: group, sample_detail_level: 10)
        sample.molecule_name_id = molecule_name.id
        sample.save
        get '/api/v1/suggestions/samples', params: params
      end

      it 'still finds the suggestion' do
        expect(parsed_json_response['suggestions'].length).to be 1
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

  describe 'GET /api/v1/suggestions/device_descriptions' do
    include_context 'api request authorization context'

    context 'when searching for device descriptions' do
      let(:device_description) do
        create(
          :device_description, :with_ontologies, name: 'test device description',
                                                 vendor_device_name: 'test device name', creator: user
        )
      end
      let(:query) { 'test' }

      before do
        CollectionsDeviceDescription.create!(device_description: device_description, collection: collection)
        get '/api/v1/suggestions/device_descriptions', params: params
      end

      it 'returns two device description suggestions' do
        expect(response.status).to be 200
        expect(parsed_json_response['suggestions'].length).to be 2
        search_by_methods = parsed_json_response['suggestions'].pluck('search_by_method')
        expect(search_by_methods).to include('device_description_name', 'device_description_vendor_device_name')
      end
    end
  end

  # rubocop:disable RSpec/MultipleMemoizedHelpers
  describe 'GET /api/v1/suggestions/:element_type with quotes in the query and scoping' do
    include_context 'api request authorization context'

    let(:other_collection) { create(:collection, user: user) }
    let(:suggestion_names) { parsed_json_response['suggestions'].pluck('name') }
    let(:sbmm) { create(:uniprot_sbmm) }
    let(:sbmm_sample_in_collection) do
      create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user,
                                                   name: "O'Brien in collection")
    end
    let(:sbmm_sample_elsewhere) do
      create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user,
                                                   name: "O'Brien elsewhere")
    end
    let(:device_description_in_collection) do
      create(:device_description, name: "O'Brien in collection", general_tags: ["o'brien-tag"], creator: user)
    end
    let(:device_description_elsewhere) do
      create(:device_description, name: "O'Brien elsewhere", general_tags: ["o'brien-gone"], creator: user)
    end
    let(:deleted_device_description) do
      create(:device_description, name: "O'Brien deleted", general_tags: ["o'brien-deleted"], creator: user)
    end
    let(:query) { "o'brien" }

    before do
      CollectionsSequenceBasedMacromoleculeSample.create!(
        sequence_based_macromolecule_sample: sbmm_sample_in_collection, collection: collection,
      )
      CollectionsSequenceBasedMacromoleculeSample.create!(
        sequence_based_macromolecule_sample: sbmm_sample_elsewhere, collection: other_collection,
      )
      CollectionsDeviceDescription.create!(device_description: device_description_in_collection,
                                           collection: collection)
      CollectionsDeviceDescription.create!(device_description: device_description_elsewhere,
                                           collection: other_collection)
      CollectionsDeviceDescription.create!(device_description: deleted_device_description, collection: collection)
      deleted_device_description.destroy
    end

    %w[all sequence_based_macromolecule_samples device_descriptions].each do |element_type|
      it "handles a quote in the query for #{element_type}" do
        get "/api/v1/suggestions/#{element_type}", params: params

        expect(response).to have_http_status(:success)
      end
    end

    it 'only suggests sbmm samples of the requested collection' do
      get '/api/v1/suggestions/sequence_based_macromolecule_samples', params: params

      expect(suggestion_names).to include("O'Brien in collection")
      expect(suggestion_names).not_to include("O'Brien elsewhere")
    end

    it 'only suggests non-deleted device descriptions of the requested collection' do
      get '/api/v1/suggestions/device_descriptions', params: params

      expect(suggestion_names).to include("O'Brien in collection", "o'brien-tag")
      expect(suggestion_names).not_to include(
        "O'Brien elsewhere", "o'brien-gone", "O'Brien deleted", "o'brien-deleted"
      )
    end

    it 'treats LIKE wildcards in the query literally' do
      get '/api/v1/suggestions/device_descriptions', params: params.merge(query: '%')

      expect(suggestion_names).to be_empty
    end
  end
  # rubocop:enable RSpec/MultipleMemoizedHelpers

  context 'when user is authenticated' do
    include_context 'api request authorization context'
    let(:query) { 'query' }

    it 'returns suggestions object with the correct structure' do
      get '/api/v1/suggestions/all',
          params: {
            collection_id: collection.id,
            query: query,
          }
      expect(response).to have_http_status(:success)
      expect(parsed_json_response.keys).to contain_exactly('suggestions')
      suggestions = parsed_json_response['suggestions']
      expect(suggestions).to be_an(Array)
    end
  end

  context 'when user is not authenticated' do
    let(:query) { 'query' }

    it 'returns unauthorized error' do
      get '/api/v1/suggestions/all', params: { collection_id: collection.id, query: query }

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
