# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::ReactionAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }
  let(:reaction) { create(:reaction, creator: user, collections: [collection]) }
  let(:base_params) do
    {
      collection_id: collection.id,
      container: { name: 'new', container_type: 'root', is_new: true, children: [] },
      materials: { products: [] },
    }
  end

  shared_examples 'validates environmental conditions' do
    def save_environment(attributes)
      public_send(request_method, request_path, params: base_params.merge(attributes), as: :json)
    end

    def saved_environment
      Reaction.find(response.parsed_body.fetch('reaction').fetch('id')).environment
    end

    it 'preserves all declared measurements and units' do
      environment = {
        'temperature' => { 'value' => '-4.5', 'unit' => '°F' },
        'humidity' => { 'value' => '0', 'unit' => '%' },
        'air_pressure' => { 'value' => '760', 'unit' => 'torr' },
      }
      save_environment(environment: environment)

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq(environment)
    end

    it 'accepts partial objects and empty measurement values' do
      environment = { 'temperature' => { 'value' => '' }, 'humidity' => {} }
      save_environment(environment: environment)

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq(environment)
    end

    it 'accepts an empty environment object' do
      save_environment(environment: {})

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq({})
    end

    it 'leaves existing or default conditions intact when environment is omitted' do
      expected = request_method == :put ? reaction.environment : Reaction.column_defaults['environment']
      save_environment({})

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq(expected)
    end

    it 'excludes undeclared fields at both levels' do
      environment = {
        temperature: { value: '22', unit: '°C', nested: { value: 'unexpected' } },
        unexpected: { value: 'unexpected' },
      }
      save_environment(environment: environment)

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq('temperature' => { 'value' => '22', 'unit' => '°C' })
    end

    [
      nil, 'hot', [],
      { temperature: 'hot' }, { humidity: [] }, { air_pressure: nil },
      { temperature: { value: { nested: '22' } } },
      { humidity: { value: ['45'] } },
      { temperature: { unit: 'C' } }, { humidity: { unit: 'percent' } },
      { air_pressure: { unit: 'hPa' } }, { air_pressure: { unit: 'Pa' } },
      { temperature: { unit: nil } }, { air_pressure: { unit: '' } }
    ].each do |environment|
      it "rejects malformed environment #{environment.inspect}" do
        original = reaction.environment if request_method == :put
        count = Reaction.count
        save_environment(environment: environment)

        expect(response).to have_http_status(:bad_request)
        expect(Reaction.count).to eq(count)
        expect(reaction.reload.environment).to eq(original) if request_method == :put
      end
    end
  end

  context 'when creating a reaction' do
    let(:request_method) { :post }
    let(:request_path) { '/api/v1/reactions' }

    it_behaves_like 'validates environmental conditions'
  end

  context 'when updating a reaction' do
    let(:request_method) { :put }
    let(:request_path) { "/api/v1/reactions/#{reaction.id}" }

    it_behaves_like 'validates environmental conditions'
  end
end
