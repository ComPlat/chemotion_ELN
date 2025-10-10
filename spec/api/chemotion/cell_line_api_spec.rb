# frozen_string_literal: true

# rubocop:disable RSpec/LetSetup, RSpec/NestedGroups, RSpec/AnyInstance

require 'rails_helper'

describe Chemotion::CellLineAPI do
  include_context 'api request authorization context'

  describe 'GET /api/v1/cell_lines/' do
    let(:collection) { create(:collection, user: user) }
    let(:material) { create(:cellline_material) }
    let!(:cell_line) { create(:cellline_sample, collections: [collection], cellline_material: material) }
    let!(:cell_line2) do
      create(:cellline_sample,
             collections: [collection],
             cellline_material: material,
             created_at: DateTime.parse('2000-01-01'),
             updated_at: DateTime.parse('2010-01-01'))
    end

    let(:params) { { collection_id: collection.id } }

    context 'when collection is accessable and got 2 cell lines' do
      context 'when fetching by id without restrictions' do
        before do
          get '/api/v1/cell_lines/', params: params
        end

        it 'returns correct response code' do
          expect(response).to have_http_status :ok
        end

        it 'returns two cell lines' do
          expect(parsed_json_response['cell_lines'].count).to be 2
        end
      end

      context 'when fetching by id with created at restriction (from_date)' do
        let(:params) do
          { collection_id: collection.id,
            from_date: DateTime.parse('2022-01-01').to_i,
            filter_created_at: true }
        end

        before do
          get '/api/v1/cell_lines/', params: params
        end

        it 'returns correct response code' do
          expect(response).to have_http_status :ok
        end

        it 'returns one cell line' do
          expect(parsed_json_response['cell_lines'].count).to be 1
          expect(parsed_json_response['cell_lines'].first['id']).to be cell_line.id
        end
      end

      context 'when fetching by id with created at restriction (to_date)' do
        let(:params) do
          { collection_id: collection.id,
            to_date: DateTime.parse('2022-01-01').to_i,
            filter_created_at: true }
        end

        before do
          get '/api/v1/cell_lines/', params: params
        end

        it 'returns correct response code' do
          expect(response).to have_http_status :ok
        end

        it 'returns one cell line' do
          expect(parsed_json_response['cell_lines'].count).to be 1
          expect(parsed_json_response['cell_lines'].first['id']).to be cell_line2.id
        end
      end

      context 'when fetching by id with updated_at restriction (from_date)' do
        let(:params) do
          { collection_id: collection.id,
            from_date: DateTime.parse('2011-01-01').to_i,
            filter_created_at: false }
        end

        before do
          get '/api/v1/cell_lines/', params: params
        end

        it 'returns correct response code' do
          expect(response).to have_http_status :ok
        end

        it 'returns one cell line' do
          expect(parsed_json_response['cell_lines'].count).to be 1
          expect(parsed_json_response['cell_lines'].first['id']).to be cell_line.id
        end
      end

      context 'when fetching by id with updated_at restriction (to_date)' do
        let(:params) do
          { collection_id: collection.id,
            to_date: DateTime.parse('2009-01-01').to_i,
            filter_created_at: false }
        end

        before do
          get '/api/v1/cell_lines/', params: params
        end

        it 'returns correct response code' do
          expect(response).to have_http_status :ok
        end

        it 'returns no cell line' do
          expect(parsed_json_response['cell_lines'].count).to be 0
        end
      end
    end
  end

  describe 'GET /api/v1/cell_lines/{:id}' do
    let(:collection) { create(:collection, user: user) }
    let(:cell_line) { create(:cellline_sample, collections: [collection]) }

    context 'when cell line exists' do
      before do
        get "/api/v1/cell_lines/#{cell_line.id}"
      end

      it 'returns correct http status 200' do
        expect(response).to have_http_status :ok
      end

      it 'returns correct cell line' do
        expect(parsed_json_response['amount']).to be 999
        expect(parsed_json_response['passage']).to be 10
      end
    end

    context 'when cell does not line exist' do
      before do
        get '/api/v1/cell_lines/-1'
      end

      it 'returns correct http status 400' do
        expect(response).to have_http_status :bad_request
      end

      it 'correct error message' do
        expect(parsed_json_response['error']).to eq 'id not valid'
      end
    end
  end

  describe 'POST /api/v1/cell_lines/' do
    context 'with correct parameter' do
      let(:collection) { Collection.first }
      let(:params) do
        {
          organism: 'something',
          tissue: 'another',
          amount: 100,
          passage: 200,
          disease: 'disease',
          material_names: '[sd]',
          biosafety_level: 'S1',
          source: 'IPB',
          unit: 'g',
          collection_id: collection.id,
          container: {},
        }
      end

      before do
        post '/api/v1/cell_lines/', params: params, as: :json
      end

      it 'returns correct status code 201' do
        expect(response).to have_http_status :created
      end

      it 'returns correct representation of saved cell line sample' do # rubocop:disable RSpec/MultipleExpectations
        expect(parsed_json_response['amount']).to be 100
        expect(parsed_json_response['passage']).to be 200
        expect(parsed_json_response['contamination']).to be_nil
        expect(parsed_json_response['source']).to be_nil
        expect(parsed_json_response['growth_medium']).to be_nil
        expect(parsed_json_response['name']).to be_nil
        expect(parsed_json_response['description']).to be_nil
        expect(parsed_json_response['unit']).to eq 'g'
        expect(parsed_json_response['cellline_material']['name']).to eq '[sd]'
        expect(parsed_json_response['cellline_material']['cell_type']).to be_nil
        expect(parsed_json_response['cellline_material']['organism']).to eq 'something'
        expect(parsed_json_response['cellline_material']['tissue']).to eq 'another'
        expect(parsed_json_response['cellline_material']['disease']).to eq 'disease'
        expect(parsed_json_response['cellline_material']['biosafety_level']).to eq 'S1'
      end
    end

    context 'with incorrect parameter' do
      let(:collection) { Collection.first }
      let(:params) do
        {
          passage: 200,
          disease: 'disease',
          material_names: '[sd]',
          biosafety_level: 'S1',
          collection_id: collection.id,
        }
      end

      before do
        post '/api/v1/cell_lines/', params: params, as: :json
      end

      it 'returns error status code 400' do
        expect(response).to have_http_status :bad_request
      end
    end
  end

  describe 'GET /api/v1/cell_lines/material' do
    context 'when material does not exist' do
      before do
        get '/api/v1/cell_lines/material/-1'
      end

      it 'returns correct response code' do
        expect(response).to have_http_status :unauthorized
      end
    end

    context 'when material exists' do
      let(:material) { create(:cellline_material) }

      before do
        get "/api/v1/cell_lines/material/#{material.id}"
      end

      it 'returns correct response code' do
        expect(response).to have_http_status :ok
      end

      it 'returns correct material' do
        expect(parsed_json_response['id']).to be material.id
      end
    end
  end

  describe 'POST /api/v1/cell_lines/copy' do
    let(:collection) { create(:collection, user: user, label: 'other collection') }
    let!(:cell_line) { create(:cellline_sample, collections: [collection]) }
    let(:allow_creation) { true }
    let(:container_param)  do
      { 'name' => 'new',
        'children' =>
[{ 'name' => 'new',
   'children' => [],
   'attachments' => [],
   'is_deleted' => false,
   'description' => '',
   'extended_metadata' => { 'report' => true },
   'container_type' => 'analyses',
   'id' => '656936a0-0627-11ef-b812-d3c35856aafa',
   'is_new' => true,
   '_checksum' => '6901ba2b29f8464ede2dce839d1dfba710dbbfa6d2c4ad80f6bd3a933e792028' }],
        'attachments' => [],
        'is_deleted' => false,
        'description' => '',
        'extended_metadata' => { 'report' => true },
        'container_type' => 'root',
        'id' => '65690f90-0627-11ef-b812-d3c35856aafa',
        'is_new' => true,
        '_checksum' => '7a0f02ddb8c73d674640466b84ce50e53465a7d91265aa0e8ece271f099d04f5' }
    end
    let(:params) do
      {
        id: cell_line.id,
        collection_id: collection.id,
        container: container_param,
      }
    end

    before do
      allow_any_instance_of(ElementsPolicy).to receive(:update?).and_return(allow_creation)
      post '/api/v1/cell_lines/copy', params: params
    end

    context 'when cell line not accessable' do
      let(:params) { { id: '-1', collection_id: collection.id, container: container_param } }

      it 'returns correct response code 400' do
        expect(response).to have_http_status :bad_request
      end
    end

    context 'when user only has read access' do
      let(:allow_creation) { false }

      before do
        allow_any_instance_of(ElementPolicy).to receive(:update?).and_return(false)
        post '/api/v1/cell_lines/copy', params: params
      end

      it 'returns correct response code 401' do
        expect(response).to have_http_status :unauthorized
      end
    end

    context 'when user has write access' do
      it 'returns correct response code' do
        expect(response).to have_http_status :created
      end

      it 'copied cell line sample was created' do
        loaded_cell_line_sample = CelllineSample.find(parsed_json_response['id'])
        expect(loaded_cell_line_sample).not_to be_nil
      end

      it 'copied cell line added to all and original collection' do
        loaded_cell_line_sample = CelllineSample.find(parsed_json_response['id'])
        collection_labels = loaded_cell_line_sample.collections.order(:label).pluck(:label)
        expect(collection_labels).to eq ['All', 'other collection']
      end
    end
  end

  describe 'POST /api/v1/cell_lines/split' do
    let(:collection) { create(:collection, user: user, label: 'other collection') }
    let!(:cell_line) { create(:cellline_sample, collections: [collection]) }
    let(:allow_creation) { true }
    let(:params) do
      {
        id: cell_line.id,
        collection_id: collection.id,
      }
    end

    context 'when user has write access' do
      before do
        allow_any_instance_of(ElementsPolicy).to receive(:update?).and_return(allow_creation)
        post '/api/v1/cell_lines/split', params: params
      end

      it 'returns correct response code' do
        expect(response).to have_http_status :created
      end

      it 'splitted cell_line_sample was created' do
        expect(parsed_json_response['id']).not_to be cell_line.id
      end

      it 'splitted cell_line short label is correct' do
        expect(parsed_json_response['short_label']).to eq "#{cell_line.short_label}-1"
      end

      it 'check if ancestry relationship is correct' do
        splitted_cellline = CelllineSample.find(parsed_json_response['id'])
        expect(splitted_cellline.parent.id).to be cell_line.id
        expect(cell_line.reload.children.first.id).to be splitted_cellline.id
      end
    end
  end
end
# rubocop:enable RSpec/LetSetup, RSpec/NestedGroups, RSpec/AnyInstance
