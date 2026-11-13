# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ComponentAPI do
  include_context 'api request authorization context'

  let!(:sample) { create(:valid_sample, creator: user, collections: [create(:collection, user_id: user.id)]) }
  let!(:molecule) { create(:molecule) }
  let!(:molecule1) { create(:molecule) }
  let!(:component) do
    component_props = { 'molecule_id' => molecule.id }
    component_props['molecule'] = Entities::MoleculeEntity.represent(molecule, current_user: user).as_json
    create(:component, sample_id: sample.id, component_properties: component_props)
  end
  let!(:new_component) do
    component_props = { 'molecule_id' => molecule1.id }
    component_props['molecule'] = Entities::MoleculeEntity.represent(molecule1, current_user: user).as_json
    create(:component, sample_id: sample.id, component_properties: component_props)
  end

  describe 'GET /api/v1/components/:sample_id' do
    it 'returns components with molecule data' do
      get "/api/v1/components/#{sample.id}"

      expect(response).to have_http_status(:success)
      parsed_response = JSON.parse(response.body)
      expect(parsed_response.count).to eq(2)
      molecule_ids = parsed_response.map { |c| c.dig('component_properties', 'molecule', 'id') }
      expect(molecule_ids).to contain_exactly(molecule.id, molecule1.id)
    end

    it 'returns an empty array if no components exist' do
      get "/api/v1//components/#{sample.id + 1}"
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq([])
    end
  end

  describe 'PUT /api/v1/components' do
    let(:valid_params) do
      {
        sample_id: sample.id,
        components: [
          {
            id: component.id,
            name: 'Updated Component',
            position: 1,
            component_properties: {
              molecule_id: molecule.id,
              amount_mol: 0.5,
              purity: 0.95,
            },
          },
        ],
      }
    end

    let(:new_component_params) do
      {
        sample_id: sample.id,
        components: [
          {
            id: component.id,
            name: 'Updated Component',
            position: 1,
            component_properties: {
              molecule_id: molecule.id,
              amount_mol: 0.5,
              purity: 0.95,
            },
          },
          {
            id: new_component.id,
            name: 'New Component',
            position: 2,
            component_properties: {
              molecule_id: molecule1.id,
              amount_mol: 1.0,
              purity: 0.90,
            },
          },
        ],
      }
    end

    it 'updates an existing component' do
      put '/api/v1/components', params: valid_params, as: :json
      expect(response).to have_http_status(:success)

      updated_component = Component.find(component.id)
      expect(updated_component.name).to eq('Updated Component')
      expect(updated_component.component_properties['amount_mol']).to eq(0.5)
      expect(updated_component.component_properties['purity']).to eq(0.95)
    end

    it 'deletes components that are not in the request' do
      put '/api/v1/components', params: valid_params, as: :json
      expect(response).to have_http_status(:success)
      expect(Component.count).to eq(1)
    end

    # Regression: relative_molecular_weight was undeclared, so a client-sent string persisted
    # verbatim and later crashed report generation and the mixture-weight write path
    # (ComPlat/chemotion_ELN#3170). Declaring it Float makes Grape coerce it at the boundary.
    it 'coerces a numeric-string relative_molecular_weight to a Float' do
      params = {
        sample_id: sample.id,
        components: [
          {
            id: component.id,
            name: 'Updated Component',
            position: 1,
            component_properties: {
              molecule_id: molecule.id,
              amount_mol: 0.5,
              relative_molecular_weight: '150.0',
            },
          },
        ],
      }

      put '/api/v1/components', params: params, as: :json

      expect(response).to have_http_status(:success)
      stored = Component.find(component.id).component_properties['relative_molecular_weight']
      expect(stored).to eq(150.0)
      expect(stored).to be_a(Float)
    end
  end
end
