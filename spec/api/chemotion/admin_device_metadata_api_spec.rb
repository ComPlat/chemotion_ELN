# frozen_string_literal: true

RSpec.describe Chemotion::AdminDeviceMetadataAPI do
  let!(:admin1) { create(:admin) }
  let(:warden_instance) { instance_double(WardenAuthentication) }
  let(:device) { create(:device) }
  let(:device_metadata) do
    create(:device_metadata, data_cite_prefix: ENV.fetch('DATA_CITE_PREFIX', nil),
                             doi: "#{ENV.fetch('DATA_CITE_PREFIX', nil)}/DEVICE-3", device: device)
  end

  before do
    allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
    allow(warden_instance).to receive(:current_user).and_return(admin1)
  end

  describe 'GET /api/v1/admin_device_metadata' do
    it 'fetches device metadata by device' do
      get "/api/v1/admin_device_metadata/#{device_metadata.device_id}"
      expect(parsed_json_response['device_metadata']['name']).to eql(device_metadata.name)
    end
  end

  describe 'PUT /api/v1/admin_device_metadata' do
    before do
      stub_request(:get, "https://api.test.datacite.org/dois/#{ENV.fetch('DATA_CITE_PREFIX', nil)}/DEVICE-3")
        .to_return(status: 200,
                   body: Rails.root.join('spec/fixtures/data_cite/get_doi_response.json').read,
                   headers: { 'Content-Type' => 'application/json' })

      stub_request(:put, "https://api.test.datacite.org/dois/#{ENV.fetch('DATA_CITE_PREFIX', nil)}/DEVICE-3")
        .to_return(status: 200,
                   body: Rails.root.join('spec/fixtures/data_cite/update_doi_response.json').read,
                   headers: { 'Content-Type' => 'application/json' })
    end

    it 'synchronizes device metadata to data cite' do
      expect(device_metadata.data_cite_updated_at).to be_blank

      put "/api/v1/admin_device_metadata/#{device_metadata.device_id}/sync_to_data_cite"
      expect(device_metadata.reload.data_cite_updated_at).to be_present
    end
  end

  describe 'POST /api/v1/admin_device_metadata' do
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
            ownerIdentifier: { id: 'test-id' },
          },
        ],
      }
    end
    let(:update_params) do
      {
        device_id: device.id,
        owners: [
          {
            ownerName: Faker::Company.name,
            ownerContact: Faker::Internet.email,
            ownerIdentifier: { id: 'test-id-2' },
          },
        ],
      }
    end

    context 'when creating device metadata without existing DOI at DataCite' do
      before do
        stub_request(:get, 'https://api.test.datacite.org/dois/10.12345/DEVICE-XXXXXXXXXXX')
          .to_return(status: 404,
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'creates device metadata' do
        post '/api/v1/admin_device_metadata', params: params
        new_doi_from_data_cite = "#{ENV.fetch('DATA_CITE_PREFIX', nil)}/DEVICE-1"
        expect(device.device_metadata.doi).to eql(new_doi_from_data_cite)

        attributes = params.merge(doi: new_doi_from_data_cite).deep_stringify_keys
        expect(device.device_metadata).to have_attributes(attributes)
      end
    end

    context 'when updating device metadata' do
      before do
        stub_request(:get, 'https://api.test.datacite.org/dois/10.12345/DEVICE-XXXXXXXXXXX')
          .to_return(status: 404,
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'Updates device metadata' do
        post '/api/v1/admin_device_metadata', params: update_params
        new_doi_from_data_cite = "#{ENV.fetch('DATA_CITE_PREFIX', nil)}/DEVICE-1"
        expect(device.device_metadata.doi).to eql(new_doi_from_data_cite)

        attributes = update_params.merge(doi: new_doi_from_data_cite).deep_stringify_keys
        expect(device.device_metadata).to have_attributes(attributes)
      end
    end
  end
end
