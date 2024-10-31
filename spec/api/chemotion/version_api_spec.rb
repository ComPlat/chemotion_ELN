# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::VersionAPI do
  include_context 'api request authorization context'

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

  describe 'POST /api/v1/versions/revert' do
    let(:sample) { create(:sample) }
    let(:old_name) { 'Sample 1' }
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
end
