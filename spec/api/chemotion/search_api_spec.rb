# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/MultipleExpectations

describe Chemotion::SearchAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:other_collection) { create(:collection, user: other_user) }
  let(:sorting_collection) { create(:collection, user: user) }
  let(:sample_a) { create(:sample, name: 'SampleA', creator: user) }
  let(:sample_b) { create(:sample, name: 'SampleB', creator: user) }
  let(:sample_c) { create(:sample, name: 'SampleC', creator: other_user) }
  let(:sample_d) { create(:sample, name: 'SampleD', creator: other_user) }
  let(:sample_sorting_a) do
    create(:sample, name: 'Sorting_Sample_A', creator: user,
                    created_at: Date.strptime('10/15/1090', '%m/%d/%Y'),
                    updated_at: Date.strptime('10/15/2015', '%m/%d/%Y'))
  end
  let(:sample_sorting_b) do
    create(:sample, name: 'Sorting_Sample_B', creator: user,
                    created_at: Date.strptime('10/15/1080', '%m/%d/%Y'),
                    updated_at: Date.strptime('10/15/2013', '%m/%d/%Y'))
  end
  let(:sample_sorting_c) do
    create(:sample, name: 'Sorting_Sample_C', creator: user,
                    created_at: Date.strptime('10/15/1070', '%m/%d/%Y'),
                    updated_at: Date.strptime('10/15/2014', '%m/%d/%Y'))
  end

  let(:sample_sorting_d) do
    create(:sample, name: 'Sorting_Sample_C', creator: user,
                    molecule: FactoryBot.create(:molecule),
                    created_at: Date.strptime('10/15/1085', '%m/%d/%Y'),
                    updated_at: Date.strptime('11/15/2014', '%m/%d/%Y'))
  end

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
  let(:other_reaction) { create(:reaction, name: 'Other Reaction', samples: [sample_c, sample_d], creator: other_user) }
  let(:screen) { create(:screen, name: 'Screen') }
  let(:other_screen) { create(:screen, name: 'Other Screen') }
  let!(:cell_line) { create(:cellline_sample, name: 'another-cellline-search-example', collections: [collection]) }

  before do
    CollectionsReaction.create!(reaction: reaction, collection: collection)
    CollectionsReaction.create!(reaction: invalid_reaction_with_duration, collection: collection)
    CollectionsReaction.create!(reaction: reaction_with_duration, collection: collection)

    CollectionsReaction.create!(reaction: reaction_with_temperature, collection: collection)
    CollectionsReaction.create!(reaction: reaction_with_negative_temperature, collection: collection)
    CollectionsReaction.create!(reaction: invalid_reaction_with_temperature, collection: collection)
    CollectionsSample.create!(sample: sample_a, collection: collection)
    CollectionsScreen.create!(screen: screen, collection: collection)
    CollectionsWellplate.create!(wellplate: wellplate, collection: collection)
    ScreensWellplate.create!(wellplate: wellplate, screen: screen)

    CollectionsReaction.create!(reaction: other_reaction, collection: other_collection)
    CollectionsSample.create!(sample: sample_b, collection: other_collection)
    CollectionsScreen.create!(screen: other_screen, collection: other_collection)
    CollectionsWellplate.create!(wellplate: other_wellplate, collection: other_collection)
    ScreensWellplate.create!(wellplate: other_wellplate, screen: other_screen)

    CollectionsSample.create!(sample: sample_sorting_a, collection: sorting_collection)
    CollectionsSample.create!(sample: sample_sorting_b, collection: sorting_collection)
    CollectionsSample.create!(sample: sample_sorting_c, collection: sorting_collection)
    CollectionsSample.create!(sample: sample_sorting_d, collection: sorting_collection)

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
    let(:collection_id){collection.id}
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
        collection_id: collection_id,
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
            value: 12,
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

    context 'with focus on sorting' do
      let(:search_column){ 'created_at'}
      let(:search_direction){ 'ascending'}
      let(:result) { JSON.parse(response.body) }
      let(:search_term) { 'Sorting_Sample' }
      let(:collection_id){ sorting_collection.id}
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
            sorting: {
              column: search_column,
              direction: search_direction,
            },
          },
        ]
      end

      context 'when searching for names and sorted by creation dates ascending' do
        it 'returns four samples' do
          expect(result.dig('samples', 'totalElements')).to eq 4
        end

        it 'all four samples are in correct order' do
          expect(result.dig('samples','elements').first.dig('created_at')).to eq '15.10.1070, 00:00:00 +0000'
          expect(result.dig('samples','elements').second.dig('created_at')).to eq '15.10.1080, 00:00:00 +0000'
          expect(result.dig('samples','elements').third.dig('created_at')).to eq '15.10.1085, 00:00:00 +0000'
          expect(result.dig('samples','elements').fourth.dig('created_at')).to eq '15.10.1090, 00:00:00 +0000'
        end
      end

      context 'when searching for names and sorted by creation dates descending' do
        let(:search_direction){ 'descending'}

        it 'returns four samples' do
          expect(result.dig('samples', 'totalElements')).to eq 4
        end

        it 'all four samples are in correct order' do
          expect(result.dig('samples','elements').first.dig('created_at')).to eq '15.10.1090, 00:00:00 +0000'
          expect(result.dig('samples','elements').second.dig('created_at')).to eq '15.10.1085, 00:00:00 +0000'
          expect(result.dig('samples','elements').third.dig('created_at')).to eq '15.10.1080, 00:00:00 +0000'
          expect(result.dig('samples','elements').fourth.dig('created_at')).to eq '15.10.1070, 00:00:00 +0000'
        end
      end
      context 'when searching for names and sorted by updated dates ascending' do
        let(:search_column){ 'updated_at'}

        it 'returns four samples' do
          expect(result.dig('samples', 'totalElements')).to eq 4
        end

        it 'all four samples are in correct order' do
          expect(result.dig('samples','elements').first.dig('updated_at')).to eq '15.10.2013, 00:00:00 +0000'
          expect(result.dig('samples','elements').second.dig('updated_at')).to eq '15.10.2014, 00:00:00 +0000'
          expect(result.dig('samples','elements').third.dig('updated_at')).to eq '15.11.2014, 00:00:00 +0000'
          expect(result.dig('samples','elements').fourth.dig('updated_at')).to eq '15.10.2015, 00:00:00 +0000'
        end
      end

      context 'when searching for names and sorted by updated dates descending' do
        let(:search_column){ 'updated_at'}
        let(:search_direction){ 'descending'}

        it 'returns four samples' do
          expect(result.dig('samples', 'totalElements')).to eq 4
        end

        it 'all four samples are in correct order' do
          expect(result.dig('samples','elements').first.dig('updated_at')).to eq '15.10.2015, 00:00:00 +0000'
          expect(result.dig('samples','elements').second.dig('updated_at')).to eq '15.11.2014, 00:00:00 +0000'
          expect(result.dig('samples','elements').third.dig('updated_at')).to eq '15.10.2014, 00:00:00 +0000'
          expect(result.dig('samples','elements').fourth.dig('updated_at')).to eq '15.10.2013, 00:00:00 +0000'
        end
      end

    end
  end

  describe 'POST /api/v1/search/structure' do
    let(:url) { '/api/v1/search/structure' }
    let(:params) do
      {
        selection: {
          elementType: :structure,
          molfile: molfile,
          search_type: 'sub',
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

    context 'when searching a molfile in samples in correct collection' do
      let(:molfile) { sample_a.molfile }

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
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/MultipleExpectations
