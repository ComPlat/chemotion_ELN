# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::VesselAPI do
  include_context 'api request authorisation context'

  describe 'GET /api/v1/vessels/' do
    let(:vessel) { create(:vessel) }
    let(:user) { create(:user) }
    let(:collection) { create(:collection) }

    context 'vessel exists' do
      before do
        CollectionsVessel.create(collection: collection, vessel: vessel,)
        user.collections << collection
        user.save

        get "/api/v1/vessels/#{vessel.id}"
      end
      
      it 'return correct status (http 200)' do
        expect(response).to have_http_status :ok
      end

      it 'returns correct vessel' do
        # expect(parsed_json_response['']).to be 
        # add test values
      end
    end

    context 'vessel does not exist' do
      before do
        get "/api/v1/vessels/-1"
      end

      it 'returns correct status (http 401)' do
        expect(response)to have_http_status :unauthorized
      end
    end
  end
end