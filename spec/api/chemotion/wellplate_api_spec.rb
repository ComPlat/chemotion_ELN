# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::WellplateAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user_id: user.id, wellplate_detail_level: 10) }
  let(:other_user_collection) { create(:collection, user_id: user.id + 1) }
  let(:shared_collection) do
    create(:collection, user_id: user.id, is_shared: true, permission_level: 3, wellplate_detail_level: 10)
  end
  let(:wellplate) { create(:wellplate) }

  describe 'POST /api/v1/wellplates/bulk' do
    let(:params) do
      {
        wellplates: [
          attributes_for(
            :wellplate, name: 'wellplate 1', collection_id: collection.id, wells: [
              attributes_for(:well).merge(position: { x: 1, y: 1 }, is_new: true)
            ]
          ),
          attributes_for(
            :wellplate, name: 'wellplate 2', collection_id: collection.id, wells: [
              attributes_for(:well).merge(position: { x: 1, y: 2 }, is_new: true)
            ]
          )
        ]
      }
    end

    before do
      post '/api/v1/wellplates/bulk', params: params
      user.reload
    end

    it 'creates multiple wellplates' do
      expect(user.counters['wellplates']).to eq '2'
    end
  end

  describe 'POST /api/v1/wellplates/ui_state' do
    let(:params) do
      {
        ui_state: {
          all: false,
          included_ids: [wellplate.id],
          excluded_ids: [],
          collection_id: collection.id
        }
      }
    end

    before do
      CollectionsWellplate.create!(wellplate: wellplate, collection: collection)

      post '/api/v1/wellplates/ui_state/', params: params, as: :json
    end

    it 'fetches all wellplates for given ui_state' do
      expect(JSON.parse(response.body)['wellplates'].size).to eq(1)
    end
  end

  describe 'GET /api/v1/wellplates' do
    before do
      CollectionsWellplate.create!(wellplate: wellplate, collection: collection)
    end

    context 'when no error occurs' do
      it 'returns wellplates' do
        get '/api/v1/wellplates/'
        expect(JSON.parse(response.body)['wellplates'].size).to eq(1)
      end
    end

    context 'when collection_id is given' do
      let(:params) do
        { collection_id: collection.id }
      end

      it 'returns wellplates' do
        get '/api/v1/wellplates/', params: params
        expect(JSON.parse(response.body)['wellplates'].size).to eq(1)
      end

      context 'when no wellplates found' do
        it 'returns no wellplates' do
          allow(Collection).to receive(:belongs_to_current_user).and_raise(ActiveRecord::RecordNotFound)
          get '/api/v1/wellplates/', params: params
          expect(JSON.parse(response.body)['wellplates'].size).to eq(0)
        end
      end
    end

    context 'when sync_collection_id is given' do
      let(:sharer) { create(:person) }
      let(:sync_collections_user) do
        create(:sync_collections_user, collection: collection, user: user, sharer: sharer)
      end
      let(:params) do
        { sync_collection_id: sync_collections_user.id }
      end

      it 'returns wellplates' do
        get '/api/v1/wellplates/', params: params
        expect(JSON.parse(response.body)['wellplates'].size).to eq(1)
      end

      context 'when no wellplates found' do
        let(:params) do
          { sync_collection_id: sync_collections_user.id + 1 }
        end

        it 'returns no wellplates' do
          get '/api/v1/wellplates/', params: params
          expect(JSON.parse(response.body)['wellplates'].size).to eq(0)
        end
      end
    end
  end

  describe 'GET /api/v1/wellplates/:id' do
    before do
      CollectionsWellplate.create!(wellplate: wellplate, collection: collection)

      get "/api/v1/wellplates/#{wellplate.id}"
    end

    it 'returns 200 status code' do
      expect(response.status).to eq 200
    end

    it 'returns the right wellplate' do
      expect(JSON.parse(response.body)['wellplate']['name']).to eq(wellplate.name)
    end

    context 'when permissions are inappropriate' do
      let(:collection) { other_user_collection }

      it 'returns 401 unauthorized status code' do
        expect(response.status).to eq 401
      end
    end
  end

  describe 'DELETE /api/v1/wellplates' do
    let(:wellplate) { create(:wellplate, name: 'test') }

    before do
      CollectionsWellplate.create!(wellplate: wellplate, collection: shared_collection)
    end

    it 'is able to delete a wellplate by id' do
      expect do
        delete "/api/v1/wellplates/#{wellplate.id}"
      end.to change(Wellplate, :count).by(-1)
    end
  end

  describe 'PUT /api/v1/wellplates/:id' do
    let(:container) { create(:container) }
    let(:wellplate) { create(:wellplate, name: 'Testname', container: container) }
    let(:params) do
      {
        id: wellplate.id,
        name: 'Another Testname',
        wells: [attributes_for(:well).merge(position: { x: 1, y: 1 }, is_new: true)],
        container: { id: container.id }
      }
    end

    before do
      CollectionsWellplate.create!(wellplate: wellplate, collection: shared_collection)
      put "/api/v1/wellplates/#{wellplate.id}", params: params
    end

    it 'is able to change a wellplate by id' do
      expect(JSON.parse(response.body)['wellplate']['name']).to eq('Another Testname')
    end
  end

  describe 'POST /api/v1/wellplates' do
    let(:collection) { shared_collection }
    let(:container) { create(:root_container) }
    let(:params) do
      {
        name: 'Wellplate-test',
        readout_titles: %w[Mass Energy],
        wells: [],
        collection_id: collection.id,
        container: { id: container.id }
      }
    end

    before do
      post '/api/v1/wellplates/', params: params.to_json, headers: { 'CONTENT_TYPE' => 'application/json' }
      user.reload
    end

    it 'sets the correct short_label' do
      test_wellplate = Wellplate.find_by(name: 'Wellplate-test')
      expect(test_wellplate.short_label).to eq "#{user.name_abbreviation}-WP1"
    end

    it 'increments user wellplate counter' do
      expect(user.counters['wellplates']).to eq '1'
    end
  end

  describe 'POST /api/v1/wellplates/subwellplates' do
    pending 'TODO: Add missing spec'
  end

  describe 'PUT /api/v1/wellplates/import_spreadsheet/:id' do
    let(:collection) { shared_collection }
    let(:attachment) { create(:attachment) }
    let(:wellplate) { create(:wellplate, name: 'test', attachments: [attachment]) }
    let(:params) { { wellplate_id: wellplate.id, attachment_id: attachment.id } }

    let(:mock) { instance_double(Import::ImportWellplateSpreadsheet, wellplate: wellplate) }

    before do
      CollectionsWellplate.create!(wellplate: wellplate, collection: collection)
    end

    context 'when no error occurs' do
      before do
        allow(Import::ImportWellplateSpreadsheet).to receive(:new).and_return(mock)
        allow(mock).to receive(:process!)

        put "/api/v1/wellplates/import_spreadsheet/#{wellplate.id}", params: params, as: :json
      end

      it 'returns 200 status code' do
        expect(response.status).to eq 200
      end

      it 'receives process!' do
        expect(mock).to have_received(:process!)
      end

      it 'returns a hash' do
        expect(response.parsed_body).to be_a(Hash)
        expect(response.parsed_body['wellplate']['type']).to eq('wellplate')
        expect(response.parsed_body['attachments'].first['filename']).to eq(attachment.filename)
      end
    end

    context 'when import throws any exception' do
      let(:params) { { wellplate_id: wellplate.id, attachment_id: attachment.id + 1 } }

      before do
        put "/api/v1/wellplates/import_spreadsheet/#{wellplate.id}", params: params, as: :json
      end

      it 'returns 500 status code' do
        expect(response.status).to eq 500
      end
    end
  end

  describe 'POST /api/v1/wellplates/well_label' do
    pending 'TODO: Add missing spec'
  end

  describe 'POST /api/v1/wellplates/well_color_code' do
    pending 'TODO: Add missing spec'
  end
end
