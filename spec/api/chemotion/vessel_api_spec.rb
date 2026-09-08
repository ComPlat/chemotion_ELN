# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::VesselAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }
  let!(:vessel) { create(:vessel, collections: [collection], creator: user) }

  describe 'GET /api/v1/vessels' do
    context 'when collection_id is given' do
      it 'returns the vessels in that collection' do
        get '/api/v1/vessels', params: { collection_id: collection.id }

        expect(response).to have_http_status :ok
        expect(parsed_json_response['vessels'].pluck('id')).to contain_exactly(vessel.id)
      end
    end

    context 'when no collection_id is given (All)' do
      it 'returns the vessels owned by the user instead of always returning none' do
        get '/api/v1/vessels'

        expect(response).to have_http_status :ok
        expect(parsed_json_response['vessels'].pluck('id')).to contain_exactly(vessel.id)
      end
    end

    context 'when collection_id does not resolve (nonexistent or inaccessible)' do
      it 'returns an empty list rather than an error' do
        get '/api/v1/vessels', params: { collection_id: collection.id + 1_000_000 }

        expect(response).to have_http_status :ok
        expect(parsed_json_response['vessels']).to eq([])
      end
    end

    context 'when collection_id points to a collection shared with the user' do
      let(:other_user) { create(:person) }
      let(:shared_collection) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare.permission_level(:read_elements))
        end
      end
      let!(:shared_vessel) do
        create(:vessel, collections: [shared_collection], creator: other_user,
                        vessel_template: create(:vessel_template, name: 'Shared Vessel Template'))
      end

      it 'returns the vessels from the shared collection' do
        get '/api/v1/vessels', params: { collection_id: shared_collection.id }

        expect(response).to have_http_status :ok
        expect(parsed_json_response['vessels'].pluck('id')).to include(shared_vessel.id)
      end
    end
  end
end
