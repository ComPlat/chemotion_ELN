# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/MultipleExpectations,  RSpec/NestedGroups

describe Chemotion::SearchAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }
  let(:other_collection) { create(:collection, user: user) }
  let(:sample_a) { create(:sample, name: 'SampleA', creator: user) }
  let(:sample_b) { create(:sample, name: 'SampleB', creator: user) }
  let(:sample_c) { create(:sample, name: 'SampleC', creator: user) }
  let(:sample_d) { create(:sample, name: 'SampleD', creator: user) }
  let(:sample_e) { create(:sample, name: 'Methonol', creator: user, molfile: mof3000_2) }
  let(:sample_f) { create(:sample, name: 'Dekan', creator: user, molfile: mof3000_1) }
  let(:wellplate) { create(:wellplate, name: 'Wellplate', wells: [build(:well, sample: sample_a)]) }
  let(:other_wellplate) { create(:wellplate, name: 'Other Wellplate', wells: [build(:well, sample: sample_b)]) }
  let(:reaction) { create(:reaction, name: 'Reaction', samples: [sample_a, sample_b], creator: user) }
  let(:invalid_reaction_with_duration) do
    create(:reaction, name: 'invalid Reaction', creator: user, duration: 'Day(s)')
  end
  let(:reaction_with_temperature) do
    create(:reaction, name: 'reaction with temperature',
                      creator: user,
                      temperature: { data: [], userText: '21.24', valueUnit: '°C' })
  end
  let(:reaction_with_negative_temperature) do
    create(:reaction, name: 'reaction with temperature',
                      creator: user,
                      temperature: { data: [], userText: '-21', valueUnit: '°C' })
  end

  let(:invalid_reaction_with_temperature) do
    create(:reaction, name: 'invalid reaction with temperature',
                      creator: user,
                      temperature: { data: [], userText: '-4 to rt', valueUnit: '°C' })
  end

  let(:reaction_with_duration) { create(:reaction, name: 'invalid Reaction', creator: user, duration: '1.33 Day(s)') }
  let(:other_reaction) { create(:reaction, name: 'Other Reaction', samples: [sample_c, sample_d], creator: user) }
  let(:screen) { create(:screen, name: 'Screen') }
  let(:other_screen) { create(:screen, name: 'Other Screen') }
  let!(:cell_line) { create(:cellline_sample, name: 'another-cellline-search-example', collections: [collection]) }
  let!(:mof3000_1) { Rails.root.join('spec/fixtures/mof_v3000_1.mol').read }
  let!(:mof3000_2) { Rails.root.join('spec/fixtures/mof_v3000_2.mol').read }

  before do
    CollectionsReaction.create!(reaction: reaction, collection: collection)
    CollectionsReaction.create!(reaction: invalid_reaction_with_duration, collection: collection)
    CollectionsReaction.create!(reaction: reaction_with_duration, collection: collection)

    CollectionsReaction.create!(reaction: reaction_with_temperature, collection: collection)
    CollectionsReaction.create!(reaction: reaction_with_negative_temperature, collection: collection)
    CollectionsReaction.create!(reaction: invalid_reaction_with_temperature, collection: collection)
    CollectionsSample.create!(sample: sample_a, collection: collection)
    CollectionsSample.create!(sample: sample_e, collection: collection)
    CollectionsSample.create!(sample: sample_f, collection: collection)
    CollectionsScreen.create!(screen: screen, collection: collection)
    CollectionsWellplate.create!(wellplate: wellplate, collection: collection)
    ScreensWellplate.create!(wellplate: wellplate, screen: screen)

    CollectionsReaction.create!(reaction: other_reaction, collection: other_collection)
    CollectionsSample.create!(sample: sample_b, collection: other_collection)
    CollectionsScreen.create!(screen: other_screen, collection: other_collection)
    CollectionsWellplate.create!(wellplate: other_wellplate, collection: other_collection)
    ScreensWellplate.create!(wellplate: other_wellplate, screen: other_screen)

    post url, params: params
  end

  describe 'POST /api/v1/search/elements' do
    pending 'TODO: Add missing spec'
  end

  describe 'POST /api/v1/search/cell_lines' do
    let(:url) { '/api/v1/search/cell_lines' }
    let(:result) { JSON.parse(response.body) }
    let(:params) do
      {
        selection: {
          elementType: :cell_lines,
          name: search_term,
          search_by_method: search_method,
        },
        collection_id: collection.id,
      }
    end

    context 'when searching a cell line sample in correct collection by cell line material name' do
      let(:search_term) { 'name-001' }
      let(:search_method) { 'cell_line_material_name' }

      it 'returns one cell line sample object' do
        expect(result.dig('cell_lines', 'totalElements')).to eq 1
        expect(result.dig('cell_lines', 'ids')).to eq [cell_line.id]
      end
    end

    context 'when searching a cell line sample in correct collection by cell line sample name' do
      let(:search_term) { 'other' }
      let(:search_method) { 'cell_line_sample_name' }

      it 'returns one cell line sample object' do
        expect(result.dig('cell_lines', 'totalElements')).to eq 1
        expect(result.dig('cell_lines', 'ids')).to eq [cell_line.id]
      end
    end
  end

  describe 'POST /api/v1/search/all' do
    let(:url) { '/api/v1/search/all' }
    let(:search_method) { 'substring' }
    let(:search_by_method) { :substring }
    let(:result) { JSON.parse(response.body) }
    let(:params) do
      {
        selection: {
          elementType: :all,
          name: search_term,
          search_by_method: search_by_method,
        },
        collection_id: collection.id,
      }
    end

    context 'when searching a cell line sample in correct collection by cell line material name' do
      let(:search_term) { 'name-001' }
      let(:search_method) { 'cell_line_material_name' }
      let(:search_by_method) { :cell_line_material_name }

      it 'returns one cell line sample object' do
        expect(result.dig('cell_lines', 'totalElements')).to eq 1
        expect(result.dig('cell_lines', 'ids')).to eq [cell_line.id]
      end
    end

    context 'when searching a cell line sample in correct collection by cell line sample name' do
      let(:search_term) { 'cellline-search-example' }
      let(:search_method) { 'cell_line_sample_name' }
      let(:search_by_method) { :cell_line_sample_name }

      it 'returns one cell line sample object' do
        expect(result.dig('cell_lines', 'totalElements')).to eq 1
        expect(result.dig('cell_lines', 'ids')).to eq [cell_line.id]
      end
    end

    context 'when searching a sample in correct collection' do
      let(:search_term) { 'SampleA' }

      it 'returns the sample' do
        expect(result.dig('samples', 'totalElements')).to eq 1
        expect(result.dig('samples', 'ids')).to eq [sample_a.id]
      end

      it 'returns referenced reaction of sample' do
        expect(result.dig('reactions', 'totalElements')).to eq 1
        expect(result.dig('reactions', 'ids')).to eq [reaction.id]
      end

      it 'returns referenced screen of sample' do
        expect(result.dig('screens', 'totalElements')).to eq 1
        expect(result.dig('screens', 'ids')).to eq [screen.id]
      end

      it 'returns referenced wellplate of sample' do
        expect(result.dig('wellplates', 'totalElements')).to eq 1
        expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
      end
    end
  end

  describe 'POST /api/v1/search/advanced' do
    let(:url) { '/api/v1/search/advanced' }
    let(:advanced_params) do
      [
        {
          link: '',
          match: 'LIKE',
          table: 'samples',
          element_id: 0,
          field: {
            column: 'name',
            label: 'Name',
          },
          value: search_term,
          sub_values: [],
          unit: '',
        },
      ]
    end
    let(:params) do
      {
        selection: {
          elementType: :advanced,
          advanced_params: advanced_params,
          search_by_method: :advanced,
        },
        collection_id: collection.id,
        page: 1,
        per_page: 15,
        molecule_sort: true,
      }
    end

    context 'when searching a name in samples in correct collection' do
      let(:search_term) { 'SampleA' }

      it 'returns the sample and all other objects referencing the sample from the requested collection' do
        result = JSON.parse(response.body)

        expect(result.dig('reactions', 'totalElements')).to eq 1
        expect(result.dig('reactions', 'ids')).to eq [reaction.id]
        expect(result.dig('samples', 'totalElements')).to eq 1
        expect(result.dig('samples', 'ids')).to eq [sample_a.id]
        expect(result.dig('screens', 'totalElements')).to eq 1
        expect(result.dig('screens', 'ids')).to eq [screen.id]
        expect(result.dig('wellplates', 'totalElements')).to eq 1
        expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
      end
    end

    context 'when searching a duration in reactions in correct collection' do
      let(:advanced_params) do
        [
          {
            link: '',
            match: '>=',
            table: 'reactions',
            element_id: 0,
            field: {
              column: 'duration',
              label: 'Duration',
              type: 'system-defined',
              option_layers: 'duration',
              info: 'Only numbers are allowed',
              advanced: true,
            },
            value: '12.0',
            sub_values: [],
            unit: 'Hour(s)',
          },
        ]
      end

      it 'returns one reaction' do
        result = JSON.parse(response.body)
        expect(result.dig('reactions', 'totalElements')).to eq 1
      end
    end

    context 'when searching a temperature in reactions in correct collection' do
      let(:advanced_params) do
        [
          {
            available_options: [
              { value: '-22', unit: '°C' }, { value: '-7.6', unit: '°F' }, { value: '251.15', unit: 'K' }
            ],
            link: '',
            match: '>=',
            table: 'reactions',
            element_id: 0,
            field: {
              column: 'temperature',
              label: 'Temperature',
              type: 'system-defined',
              option_layers: 'temperature',
              info: 'Only numbers are allowed',
              advanced: true,
            },
            value: -22,
            sub_values: [],
            unit: '°C',
          },
        ]
      end

      it 'returns one reaction' do
        result = JSON.parse(response.body)
        expect(result.dig('reactions', 'totalElements')).to eq 2
      end
    end
  end

  describe 'POST /api/v1/search/structure' do
    let(:url) { '/api/v1/search/structure' }

    context 'when search_by_fingerprint_sim' do
      let(:params) do
        {
          selection: {
            elementType: :structure,
            molfile: molfile,
            search_type: 'similar',
            tanimoto_threshold: 0.7,
            search_by_method: :structure,
            structure_search: true,
          },
          collection_id: collection.id,
          page: 1,
          per_page: 15,
          molecule_sort: true,
        }
      end

      context 'when molecule is too small' do
        let(:molfile) { sample_a.molfile }

        it 'returns nothing found' do
          result = JSON.parse(response.body)

          expect(result.dig('reactions', 'totalElements')).to eq 0
          expect(result.dig('samples', 'totalElements')).to eq 0
          expect(result.dig('screens', 'totalElements')).to eq 0
          expect(result.dig('wellplates', 'totalElements')).to eq 0
        end
      end

      context 'when molecule is big enough' do
        let(:molfile) { sample_e.molfile }

        it 'returns the sample' do
          result = JSON.parse(response.body)

          expect(result.dig('reactions', 'totalElements')).to eq 1
          expect(result.dig('reactions', 'ids')).to eq [reaction.id]
          expect(result.dig('samples', 'totalElements')).to eq 2
          expect(result.dig('samples', 'ids')).to eq [sample_e.id, sample_a.id]
          expect(result.dig('screens', 'totalElements')).to eq 1
          expect(result.dig('screens', 'ids')).to eq [screen.id]
          expect(result.dig('wellplates', 'totalElements')).to eq 1
          expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
        end
      end
    end

    context 'when search_by_fingerprint_sub' do
      context 'when searching a molfile in samples in correct collection' do
        let(:molfile) { sample_a.molfile }

        let(:params) do
          {
            selection: {
              elementType: :structure,
              molfile: molfile,
              search_type: 'sub',
              search_by_method: :structure,
              structure_search: true,
            },
            collection_id: collection.id,
            page: 1,
            per_page: 15,
            molecule_sort: true,
          }
        end

        it 'returns the sample and all other objects referencing the sample from the requested collection' do
          result = JSON.parse(response.body)
          expect(result.dig('reactions', 'totalElements')).to eq 1
          expect(result.dig('reactions', 'ids')).to eq [reaction.id]
          expect(result.dig('samples', 'totalElements')).to eq 2
          expect(result.dig('samples', 'ids')).to eq [sample_e.id, sample_a.id]
          expect(result.dig('screens', 'totalElements')).to eq 1
          expect(result.dig('screens', 'ids')).to eq [screen.id]
          expect(result.dig('wellplates', 'totalElements')).to eq 1
          expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
        end
      end

      context 'when searching a molfile in samples in wrong collection' do
        let(:molfile) { mof3000_1 }
        let(:params) do
          {
            selection: {
              elementType: :structure,
              molfile: molfile,
              search_type: 'sub',
              search_by_method: :structure,
              structure_search: true,
            },
            collection_id: other_collection.id,
            page: 1,
            per_page: 15,
            molecule_sort: true,
          }
        end

        it 'returns nothing found' do
          result = JSON.parse(response.body)

          expect(result.dig('reactions', 'totalElements')).to eq 0
          expect(result.dig('samples', 'totalElements')).to eq 0
          expect(result.dig('screens', 'totalElements')).to eq 0
          expect(result.dig('wellplates', 'totalElements')).to eq 0
        end
      end
    end

    context 'when search_by_rdkit_sub' do
      context 'when searching a molfile in samples in correct collection' do
        let(:molfile) { sample_a.molfile }

        let(:params) do
          {
            selection: {
              elementType: :structure,
              molfile: molfile,
              search_type: 'subRDKit',
              search_by_method: :structure,
              structure_search: true,
            },
            collection_id: collection.id,
            page: 1,
            per_page: 15,
            molecule_sort: true,
          }
        end

        it 'returns the sample and all other objects referencing the sample from the requested collection' do
          result = JSON.parse(response.body)
          expect(result.dig('reactions', 'totalElements')).to eq 1
          expect(result.dig('reactions', 'ids')).to eq [reaction.id]
          expect(result.dig('samples', 'totalElements')).to eq 2
          expect(result.dig('samples', 'ids')).to eq [sample_e.id, sample_a.id]
          expect(result.dig('screens', 'totalElements')).to eq 1
          expect(result.dig('screens', 'ids')).to eq [screen.id]
          expect(result.dig('wellplates', 'totalElements')).to eq 1
          expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
        end
      end

      context 'when searching a molfile in samples in wrong collection' do
        let(:molfile) { mof3000_1 }
        let(:params) do
          {
            selection: {
              elementType: :structure,
              molfile: molfile,
              search_type: 'subRDKit',
              search_by_method: :structure,
              structure_search: true,
            },
            collection_id: other_collection.id,
            page: 1,
            per_page: 15,
            molecule_sort: true,
          }
        end

        it 'returns nothing found' do
          result = JSON.parse(response.body)

          expect(result.dig('reactions', 'totalElements')).to eq 0
          expect(result.dig('samples', 'totalElements')).to eq 0
          expect(result.dig('screens', 'totalElements')).to eq 0
          expect(result.dig('wellplates', 'totalElements')).to eq 0
        end
      end
    end
  end

  describe 'POST /api/v1/search/by_ids' do
    let(:url) { '/api/v1/search/by_ids' }
    let(:id_params) do
      {
        model_name: 'sample',
        ids: ids,
        total_elements: 2,
        with_filter: false,
      }
    end
    let(:params) do
      {
        selection: {
          elementType: :by_ids,
          id_params: id_params,
          list_filter_params: {},
          search_by_method: 'search_by_ids',
        },
        collection_id: collection.id,
        page: 1,
        page_size: 15,
        per_page: 15,
        molecule_sort: true,
      }
    end

    context 'when searching ids of search result in samples in correct collection' do
      let(:ids) { [sample_a.id, sample_b.id] }

      it 'returns the sample and all other objects referencing the sample from the requested collection' do
        result = JSON.parse(response.body)

        expect(result.dig('samples', 'totalElements')).to eq 2
        expect(result.dig('samples', 'ids')).to eq [sample_a.id.to_s, sample_b.id.to_s]
      end
    end
  end

  describe 'POST /api/v1/search/samples' do
    let(:url) { '/api/v1/search/samples' }

    context 'when searching a sample in correct collection' do
      let(:search_term) { 'SampleA' }
      let(:result) { JSON.parse(response.body) }
      let(:params) do
        {
          selection: {
            elementType: :samples,
            name: search_term,
            search_by_method: :substring,
          },
          collection_id: collection.id,
        }
      end

      it 'returns the sample' do
        expect(result.dig('samples', 'totalElements')).to eq 1
        expect(result.dig('samples', 'ids')).to eq [sample_a.id]
      end

      it 'returns referenced reaction of sample' do
        expect(result.dig('reactions', 'totalElements')).to eq 1
        expect(result.dig('reactions', 'ids')).to eq [reaction.id]
      end

      it 'returns screen reaction of sample' do
        expect(result.dig('screens', 'totalElements')).to eq 1
        expect(result.dig('screens', 'ids')).to eq [screen.id]
      end

      it 'returns wellplate reaction of sample' do
        expect(result.dig('wellplates', 'totalElements')).to eq 1
        expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
      end
    end
  end

  describe 'POST /api/v1/search/reactions' do
    pending 'TODO: Add missing spec'
  end

  describe 'POST /api/v1/search/wellplates' do
    pending 'TODO: Add missing spec'
  end

  describe 'POST /api/v1/search/screens' do
    pending 'TODO: Add missing spec'
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/MultipleExpectations, RSpec/NestedGroups
