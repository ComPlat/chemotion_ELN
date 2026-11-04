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
    let(:original_environment) { request_method == :put ? reaction.environment.deep_dup : {} }

    def save_environment(attributes)
      original_environment
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

    %w[atm pa kpa mpa hpa torr bar mbar].each do |unit|
      it "accepts the pressure unit key #{unit} used by the environment panel" do
        environment = { 'air_pressure' => { 'value' => '21,5', 'unit' => unit } }
        save_environment(environment: environment)

        expect(response).to have_http_status(:created).or have_http_status(:ok)
        expect(saved_environment).to eq(
          original_environment.deep_merge('air_pressure' => { 'value' => '21.5', 'unit' => unit }),
        )
      end
    end

    it 'normalizes decimal commas in all measurements and the API response' do
      save_environment(environment: {
                         temperature: { value: '−4,5', unit: '°C' },
                         humidity: { value: '45,5', unit: '%' },
                         air_pressure: { value: '1013,25', unit: 'mbar' },
                       })
      expected = {
        'temperature' => { 'value' => '-4.5', 'unit' => '°C' },
        'humidity' => { 'value' => '45.5', 'unit' => '%' },
        'air_pressure' => { 'value' => '1013.25', 'unit' => 'mbar' },
      }

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq expected
      expect(response.parsed_body.fetch('reaction').fetch('environment')).to eq expected
    end

    [[0, '0'], [22.5, '22.5'], [0.00000001, '0.00000001']].each do |value, expected|
      it "accepts the numeric JSON reading #{value.inspect} as a plain decimal" do
        save_environment(environment: { air_pressure: { value: value, unit: 'pa' } })

        expect(response).to have_http_status(:created).or have_http_status(:ok)
        expect(saved_environment).to eq(
          original_environment.deep_merge('air_pressure' => { 'value' => expected, 'unit' => 'pa' }),
        )
      end
    end

    %w[hot 20-22 - . -. 1.013e5 1013,25.7 NaN Infinity].each do |value|
      it "rejects the new nonnumeric value #{value.inspect} without persisting changes" do
        original = reaction.environment if request_method == :put
        count = Reaction.count
        save_environment(environment: { temperature: { value: value, unit: '°C' } })

        expect(response).to have_http_status(:unprocessable_entity)
        expect(Reaction.count).to eq count
        expect(reaction.reload.environment).to eq original if request_method == :put
      end
    end

    [
      %w[temperature C], %w[temperature F], %w[temperature degF],
      %w[humidity percent],
      %w[air_pressure psi], %w[air_pressure mPa], %w[air_pressure MPa],
      %w[air_pressure hPa], %w[air_pressure Pa]
    ].each do |field, unit|
      it "preserves the imported #{field} unit #{unit} without interpreting it" do
        environment = { field => { 'value' => '14.7', 'unit' => unit } }
        save_environment(environment: environment)

        expect(response).to have_http_status(:created).or have_http_status(:ok)
        expect(saved_environment).to eq(original_environment.deep_merge(environment))
      end
    end

    it 'accepts partial objects and empty measurement values' do
      environment = { 'temperature' => { 'value' => '' }, 'humidity' => {} }
      save_environment(environment: environment)

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq(original_environment.deep_merge(environment))
    end

    it 'accepts an empty environment object' do
      save_environment(environment: {})

      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(saved_environment).to eq(original_environment)
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
      expect(saved_environment).to eq(
        original_environment.deep_merge('temperature' => { 'value' => '22', 'unit' => '°C' }),
      )
    end

    [
      nil, 'hot', [],
      { temperature: 'hot' }, { humidity: [] }, { air_pressure: nil },
      { temperature: { value: { nested: '22' } } },
      { humidity: { value: ['45'] } },
      { temperature: { unit: { nested: '°C' } } }, { humidity: { unit: ['%'] } },
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

    context 'with recorded conditions' do
      let(:recorded_environment) do
        {
          'temperature' => { 'value' => '-4.5', 'unit' => '°F' },
          'humidity' => { 'value' => '45', 'unit' => '%' },
          'air_pressure' => { 'value' => '14.7', 'unit' => 'psi' },
        }
      end

      before { reaction.update!(environment: recorded_environment) }

      it 'updates humidity without deleting the stored temperature or pressure' do
        put request_path, params: base_params.merge(environment: { humidity: { value: '50', unit: '%' } }), as: :json
        expected = recorded_environment.deep_merge('humidity' => { 'value' => '50' })

        expect(response).to have_http_status(:ok)
        expect(reaction.reload.environment).to eq expected
        expect(response.parsed_body.fetch('reaction').fetch('environment')).to eq expected
      end

      it 'normalizes a value-only patch while preserving the stored unit and other readings' do
        put request_path, params: base_params.merge(environment: { temperature: { value: '21,5' } }), as: :json

        expect(response).to have_http_status(:ok)
        expect(reaction.reload.environment).to eq(
          recorded_environment.deep_merge('temperature' => { 'value' => '21.5' }),
        )
      end

      it 'updates only the supplied unit without deleting the stored value' do
        put request_path, params: base_params.merge(environment: { air_pressure: { unit: 'mPa' } }), as: :json

        expect(response).to have_http_status(:ok)
        expect(reaction.reload.environment).to eq(
          recorded_environment.deep_merge('air_pressure' => { 'unit' => 'mPa' }),
        )
      end

      it 'clears only a value explicitly set to an empty string' do
        put request_path, params: base_params.merge(environment: { humidity: { value: '' } }), as: :json

        expect(response).to have_http_status(:ok)
        expect(reaction.reload.environment).to eq(recorded_environment.deep_merge('humidity' => { 'value' => '' }))
      end

      [{}, { 'humidity' => {} }].each do |environment|
        it "keeps all recorded conditions when given #{environment.inspect}" do
          put request_path, params: base_params.merge(environment: environment), as: :json

          expect(response).to have_http_status(:ok)
          expect(reaction.reload.environment).to eq recorded_environment
        end
      end

      it 'rejects an invalid partial reading without changing any stored conditions' do
        put request_path, params: base_params.merge(environment: { humidity: { value: 'hot' } }), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(reaction.reload.environment).to eq recorded_environment
      end

      it 'accepts the full UI shape when clearing all three readings' do
        cleared = recorded_environment.transform_values { |reading| reading.merge('value' => '') }
        put request_path, params: base_params.merge(environment: cleared), as: :json

        expect(response).to have_http_status(:ok)
        expect(reaction.reload.environment).to eq cleared
      end
    end

    it 'accepts a partial update when the stored environment is null' do
      reaction.update!(environment: nil)
      environment = { 'humidity' => { 'value' => '45', 'unit' => '%' } }
      put request_path, params: base_params.merge(environment: environment), as: :json

      expect(response).to have_http_status(:ok)
      expect(reaction.reload.environment).to eq environment
    end

    it 'keeps unsupported imported readings when saving an unrelated name change' do
      environment = {
        'temperature' => { 'value' => '22', 'unit' => 'degF' },
        'humidity' => { 'value' => '45', 'unit' => 'percent' },
        'air_pressure' => { 'value' => '14.7', 'unit' => 'mPa' },
      }
      reaction.update!(environment: environment)
      put request_path, params: base_params.merge(name: 'Renamed reaction', environment: environment), as: :json

      expect(response).to have_http_status(:ok)
      expect(reaction.reload.name).to eq('Renamed reaction')
      expect(reaction.environment).to eq(environment)
    end

    it_behaves_like 'validates environmental conditions'
  end
end
