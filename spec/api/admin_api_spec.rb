# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AdminAPI do
  let!(:admin) { create(:admin, first_name: 'Jane', last_name: 'Doe') }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user)
      .and_return(admin)
  end

  describe 'GET /api/v1/admin/device/DEVICE_ID' do
    let(:device) { create(:device, device_metadata: create(:device_metadata)) }

    before do
      device
      get "/api/v1/admin/device/#{device.id}"
    end

    it 'returns a device with metadata' do
      device_attributes = JSON.parse(response.body)['device']

      expect(device_attributes['id']).to eql(device.id)
      expect(device_attributes['device_metadata']['device_id']).to eql(device.id)
    end
  end

  describe 'GET /api/v1/admin/deviceMetadata/DEVICE_ID' do
    let(:device) { create(:device, device_metadata: create(:device_metadata)) }

    before do
      device
      get "/api/v1/admin/deviceMetadata/#{device.id}"
    end

    it 'returns deviceMetadata' do
      device_metadata_attributes = JSON.parse(response.body)['device_metadata']

      expect(device_metadata_attributes['device_id']).to eql(device.id)
    end
  end

  describe 'PUT /api/v1/admin/deviceMetadata/DEVICE_ID/sync_to_data_cite' do
    let(:device) { create(:device) }

    let(:device_metadata) do
      create(:device_metadata, data_cite_prefix: ENV['DATA_CITE_PREFIX'], doi: "#{ENV['DATA_CITE_PREFIX']}/DEVICE-3", device: device)
    end

    before do
      device

      stub_request(:get, "https://api.test.datacite.org/dois/#{ENV['DATA_CITE_PREFIX']}/DEVICE-3")
        .to_return(status: 200,
                   body: File.read(
                     Rails.root.join('spec/fixtures/data_cite/get_doi_response.json')
                   ),
                   headers: { 'Content-Type' => 'application/json' })

      stub_request(:put, "https://api.test.datacite.org/dois/#{ENV['DATA_CITE_PREFIX']}/DEVICE-3")
        .to_return(status: 200,
                   body: File.read(
                     Rails.root.join('spec/fixtures/data_cite/update_doi_response.json')
                   ),
                   headers: { 'Content-Type' => 'application/json' })

    end

    it 'returns deviceMetadata' do
      expect(device_metadata.data_cite_updated_at).to be_blank

      put "/api/v1/admin/deviceMetadata/#{device.id}/sync_to_data_cite"

      expect(device_metadata.reload.data_cite_updated_at).to be_present
    end
  end

  describe 'POST /api/v1/admin/deviceMetadata' do
    let(:device) { create(:device) }

    let(:params) do
      {
        device_id: device.id,
        doi: '10.12345/DEVICE-XXXXXXXXXXX',
        name: 'Metadata',
        type: 'Test-Type',
        description: 'Metadata for device',
        publisher: 'Chemotion',
        publication_year: Time.current.year,
        owners: [
          {
            ownerName: Faker::Company.name,
            ownerContact: Faker::Internet.email,
            ownerIdentifier: { id: 'test-id' }
          }
        ]
      }
    end

    describe 'when updating device metadata' do
      context 'without existing DOI at DataCite' do
        before do
          device

          stub_request(:get, 'https://api.test.datacite.org/dois/10.12345/DEVICE-XXXXXXXXXXX')
            .to_return(status: 404,
                       headers: { 'Content-Type' => 'application/json' })

          post '/api/v1/admin/deviceMetadata', params: params, as: :json
        end

        it 'Creates device metadata' do
          new_doi_from_data_cite = "#{ENV['DATA_CITE_PREFIX']}/DEVICE-1"
          #new_doi_from_data_cite = '10.12345/DEVICE-XXXXXXXXXXX'
          expect(device.device_metadata.doi).to eql(new_doi_from_data_cite)

          attributes = params.merge(doi: new_doi_from_data_cite).deep_stringify_keys
          expect(device.device_metadata).to have_attributes(attributes)
        end
      end
    end

    describe 'when updating device metadata' do
      let(:update_params) do
        {
          device_id: device.id,
          owners: [
            {
              ownerName: Faker::Company.name,
              ownerContact: Faker::Internet.email,
              ownerIdentifier: { id: 'test-id-2' }
            }
          ]
        }
      end

      before do
        device

        stub_request(:get, 'https://api.test.datacite.org/dois/10.12345/DEVICE-XXXXXXXXXXX')
          .to_return(status: 404,
                     headers: { 'Content-Type' => 'application/json' })

        post '/api/v1/admin/deviceMetadata', params: params
        post '/api/v1/admin/deviceMetadata', params: update_params
      end

      it 'Updates device metadata' do
        new_doi_from_data_cite = "#{ENV['DATA_CITE_PREFIX']}/DEVICE-1"
        #new_doi_from_data_cite = '10.12345/DEVICE-XXXXXXXXXXX'
        expect(device.device_metadata.doi).to eql(new_doi_from_data_cite)

        attributes = update_params.merge(doi: new_doi_from_data_cite).deep_stringify_keys
        expect(device.device_metadata).to have_attributes(attributes)
      end
    end
  end
end
