# frozen_string_literal: true

describe Chemotion::ExplorerAPI do
  include_context 'api request authorization context'

  # The endpoint is gated behind the :sample_explorer UI component flag; enable it
  # explicitly so these specs are independent of config/ui_components.yml.
  before { allow(UiComponents).to receive(:enabled?).with(:sample_explorer).and_return(true) }

  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:other_collection) { create(:collection, user: other_user) }
  let!(:sample) { create(:valid_sample, creator: user, collections: [collection]) }

  describe 'GET /api/v1/explorer' do
    context 'when the sample_explorer UI component is disabled' do
      before { allow(UiComponents).to receive(:enabled?).with(:sample_explorer).and_return(false) }

      it 'returns 404' do
        get '/api/v1/explorer', params: { collection_id: collection.id }

        expect(response).to have_http_status(404)
      end
    end

    context 'with the user\'s own collection' do
      it 'returns the collection\'s samples, reactions, and molecules' do
        get '/api/v1/explorer', params: { collection_id: collection.id }

        expect(response).to have_http_status(200)
        expect(parsed_json_response['samples'].pluck('id')).to contain_exactly(sample.id)
        expect(parsed_json_response['reactions']).to eq([])
        expect(parsed_json_response['molecules'].pluck('id')).to contain_exactly(sample.molecule_id)
      end
    end

    context 'with a collection shared with the user at read_elements level' do
      before do
        create(
          :collection_share,
          collection: other_collection,
          shared_with: user,
          permission_level: CollectionShare.permission_level(:read_elements),
        )
      end
      let!(:shared_sample) { create(:valid_sample, creator: other_user, collections: [other_collection]) }

      it 'returns the shared collection\'s samples' do
        get '/api/v1/explorer', params: { collection_id: other_collection.id }

        expect(response).to have_http_status(200)
        expect(parsed_json_response['samples'].pluck('id')).to contain_exactly(shared_sample.id)
      end
    end

    context 'with a collection neither owned nor shared with the user' do
      it 'returns 404' do
        get '/api/v1/explorer', params: { collection_id: other_collection.id }

        expect(response).to have_http_status(404)
      end
    end
  end
end
