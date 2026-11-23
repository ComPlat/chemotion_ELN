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

  describe 'GET /api/v1/vessels/:id' do
    let(:other_user) { create(:person) }

    it 'returns a vessel in one of the user\'s collections' do
      get "/api/v1/vessels/#{vessel.id}"

      expect(response).to have_http_status :ok
      expect(parsed_json_response['id']).to eq(vessel.id)
    end

    context 'when the vessel is in a collection shared with the user' do
      let(:shared_collection) do
        create(:collection, user: other_user).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare.permission_level(:read_elements))
        end
      end
      let(:shared_vessel) do
        create(:vessel, collections: [shared_collection], creator: other_user,
                        vessel_template: vessel.vessel_template)
      end

      it 'returns the vessel' do
        get "/api/v1/vessels/#{shared_vessel.id}"

        expect(response).to have_http_status :ok
        expect(parsed_json_response['id']).to eq(shared_vessel.id)
      end
    end

    context 'when the vessel is only in another user\'s collection' do
      let(:foreign_vessel) do
        create(:vessel, collections: [create(:collection, user: other_user)], creator: other_user,
                        vessel_template: vessel.vessel_template)
      end

      it 'returns 401 without the vessel' do
        get "/api/v1/vessels/#{foreign_vessel.id}"

        expect(response).to have_http_status :unauthorized
        expect(response.body).not_to include(foreign_vessel.name)
      end
    end

    context 'when the vessel does not exist' do
      it 'returns 404' do
        get "/api/v1/vessels/#{SecureRandom.uuid}"

        expect(response).to have_http_status :not_found
      end
    end
  end

  describe 'PUT /api/v1/vessels/:id' do
    let(:other_user) { create(:person) }
    let(:new_name) { 'Renamed vessel' }

    def shared_collection_with(level)
      create(:collection, user: other_user).tap do |c|
        create(:collection_share, collection: c, shared_with: user,
                                  permission_level: CollectionShare.permission_level(level))
      end
    end

    it 'updates a vessel in one of the user\'s collections' do
      put "/api/v1/vessels/#{vessel.id}", params: { name: new_name }

      expect(response).to have_http_status :ok
      expect(vessel.reload.name).to eq(new_name)
    end

    context 'when the vessel is shared with the user with edit permission' do
      let(:shared_vessel) do
        create(:vessel, collections: [shared_collection_with(:edit_elements)], creator: other_user,
                        vessel_template: vessel.vessel_template)
      end

      it 'updates the vessel' do
        put "/api/v1/vessels/#{shared_vessel.id}", params: { name: new_name }

        expect(response).to have_http_status :ok
        expect(shared_vessel.reload.name).to eq(new_name)
      end
    end

    context 'when the vessel is shared with the user read-only' do
      let(:shared_vessel) do
        create(:vessel, collections: [shared_collection_with(:read_elements)], creator: other_user,
                        vessel_template: vessel.vessel_template)
      end

      it 'returns 401 and leaves the vessel unchanged' do
        put "/api/v1/vessels/#{shared_vessel.id}", params: { name: new_name }

        expect(response).to have_http_status :unauthorized
        expect(shared_vessel.reload.name).not_to eq(new_name)
      end
    end

    context 'when the vessel is only in another user\'s collection' do
      let(:foreign_vessel) do
        create(:vessel, collections: [create(:collection, user: other_user)], creator: other_user,
                        vessel_template: vessel.vessel_template)
      end

      it 'returns 401 and leaves the vessel unchanged' do
        put "/api/v1/vessels/#{foreign_vessel.id}", params: { name: new_name }

        expect(response).to have_http_status :unauthorized
        expect(foreign_vessel.reload.name).not_to eq(new_name)
      end
    end
  end
end
