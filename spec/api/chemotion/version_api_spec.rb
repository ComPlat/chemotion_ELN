# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::VersionAPI do
  include_context 'api request authorization context'
  let(:my_instance) { instance_double(ElementPolicy) }

  before do
    allow(ElementPolicy).to receive(:new).and_return(my_instance)
    allow(my_instance).to receive_messages(read?: true, update?: true)
  end

  describe 'GET /api/v1/versions/samples/:id' do
    let(:sample) { create(:sample) }

    before do
      get "/api/v1/versions/samples/#{sample.id}"
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns history size 1' do
      expect(response.header['X-Total']).to eq '1'
    end
  end

  describe 'GET /api/v1/versions/reactions/:id' do
    let(:reaction) { create(:reaction) }

    before do
      get "/api/v1/versions/reactions/#{reaction.id}"
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns history size 1' do
      expect(response.header['X-Total']).to eq '1'
    end
  end

  describe 'GET /api/v1/versions/research_plans/:id' do
    let(:research_plan) { create(:research_plan) }

    before do
      get "/api/v1/versions/research_plans/#{research_plan.id}"
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns history size 1' do
      expect(response.header['X-Total']).to eq '1'
    end
  end

  describe 'GET /api/v1/versions/screens/:id' do
    let(:container) { create(:container, :with_analysis) }
    let(:screen) { create(:screen, container: container) }

    before do
      get "/api/v1/versions/screens/#{screen.id}"
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns history size 1' do
      expect(response.header['X-Total']).to eq '1'
    end
  end

  describe 'GET /api/v1/versions/wellplates/:id' do
    let(:container) { create(:container, :with_analysis) }
    let(:wellplate) { create(:wellplate, :with_wells, container: container) }

    before do
      get "/api/v1/versions/wellplates/#{wellplate.id}"
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns history size 1' do
      expect(response.header['X-Total']).to eq '1'
    end
  end

  describe 'GET /api/v1/versions/cellline_samples/:id' do
    let(:cellline_sample) { create(:cellline_sample) }
    let(:changes) { parsed_json_response['versions'].flat_map { |version| version['changes'] } }
    let(:material_fields) { changes.select { |change| change['klass_name'] == 'CelllineMaterial' }.pluck('fields') }

    before do
      # each with_responsible! call starts a new history entry, like a separate API request
      Logidze.with_responsible!(user.id)
      cellline_sample
      Logidze.with_responsible!(user.id)
      cellline_sample.cellline_material.update!(description: 'updated material', organism: 'rat')
      Logidze.clear_responsible!
      get "/api/v1/versions/cellline_samples/#{cellline_sample.id}"
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'includes changes of the cell line material' do
      expect(material_fields.pluck('description')).to include(
        a_hash_including('old_value' => 'a cell', 'new_value' => 'updated material'),
      )
    end

    it 'includes changes of jsonb material fields' do
      expect(material_fields.pluck('organism')).to include(
        a_hash_including('old_value' => 'mouse', 'new_value' => 'rat', 'current_value' => 'rat'),
      )
    end

    it 'names cell line material changes by name and source' do
      material_names = changes.select { |change| change['klass_name'] == 'CelllineMaterial' }.pluck('name')
      expect(material_names).to all(eq(['Cell line material: name-001 (IPB)']))
    end

    it 'does not allow reverting cell line material changes' do
      expect(material_fields.flat_map(&:values).pluck('revert')).to all(be_empty)
    end
  end

  describe 'POST /api/v1/versions/revert' do
    let(:old_name) { 'Sample 1' }
    let(:sample) { create(:sample, name: old_name) }
    let(:params) do
      {
        changes: [{ db_id: sample.id, klass_name: 'Sample', fields: [] }],
      }
    end

    before do
      sample.name = 'wrong name'
      sample.save!
      params[:changes][0][:fields].append({ value: old_name, name: 'name' })
      post '/api/v1/versions/revert', params: params
    end

    it 'returns 201 status code' do
      expect(response.status).to eq 201
    end

    it 'Sample name is reverted' do
      expect(Sample.find(sample.id).name).to eq old_name
    end
  end

  describe 'POST /api/v1/versions/revert permissions' do
    let(:other_collection) { create(:collection, user: create(:person)) }
    let(:sample) { create(:sample, name: 'current', collections: [other_collection]) }

    before do
      allow(ElementPolicy).to receive(:new).and_call_original
      post '/api/v1/versions/revert',
           params: { changes: [{ db_id: sample.id, klass_name: 'Sample', fields: [{ name: 'name', value: 'old' }] }] }
    end

    it 'requires edit permission on the element' do
      expect(response.status).to eq 401
      expect(sample.reload.name).to eq 'current'
    end
  end

  describe 'POST /api/v1/versions/revert with a value from GET /api/v1/versions' do
    let!(:sample) do
      create(:sample, name: 'first', boiling_point: 1.0..2.0, collections: [create(:collection, user: user)])
    end

    before do
      allow(ElementPolicy).to receive(:new).and_call_original
      as_request { sample.update!(name: 'second', boiling_point: 3.0..4.0) }
    end

    it 'accepts the revertible values the History rendered' do
      get "/api/v1/versions/samples/#{sample.id}"
      changes = JSON.parse(response.body)['versions'].first['changes']
      fields = changes.find { |change| change['klass_name'] == 'Sample' }['fields']
      reverted = %w[name boiling_point].map { |name| { name: name, value: fields[name]['revertible_value'] } }
      changes = [{ db_id: sample.id, klass_name: 'Sample', fields: reverted }]
      post '/api/v1/versions/revert', params: { changes: changes.to_json }, as: :json

      expect(response.status).to eq 201
      expect(sample.reload.name).to eq 'first'
    end
  end
end
