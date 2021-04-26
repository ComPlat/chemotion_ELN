# frozen_string_literal: true

require 'rails_helper'

describe DataCite::Syncer do
  subject(:syncer) { described_class.new(device) }

  let(:device) { create(:device, device_metadata: device_metadata) }
  let(:device_metadata) { create(:device_metadata, doi: doi, data_cite_prefix: data_cite_prefix) }
  let(:doi) { "#{ENV['DATA_CITE_PREFIX']}/device-test-3" }
  let(:data_cite_prefix) { ENV['DATA_CITE_PREFIX'] }

  describe '#find_and_create_at_chemotion!' do
    let(:device_metadata) do
      create(:device_metadata,
             doi: doi, name: nil, url: nil, landing_page: nil,
             description: nil, publisher: nil, publication_year: nil, owners: [],
             manufacturers: [], dates: [])
    end

    context 'when DOI does not exist on DataCite' do
      before do
        stub_request(:get, "https://api.test.datacite.org/dois/#{doi}")
          .to_return(status: 404,
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'creates a local DOI at chemotion and syncs nothing' do
        syncer.find_and_create_at_chemotion!

        expect(syncer.converter.chemotion_metadata).to have_attributes(
          doi: "#{ENV['DATA_CITE_PREFIX']}/DEVICE-1",
          data_cite_prefix: data_cite_prefix,
          name: nil,
          publisher: nil,
          description: nil,
          publication_year: nil,
          url: nil,
          landing_page: nil,
          dates: [],

          data_cite_version: nil,
          data_cite_last_response: {},
          data_cite_created_at: nil,
          data_cite_updated_at: nil
        )
      end
    end

    context 'when DOI does not exist on DataCite' do
      before do
        stub_request(:get, "https://api.test.datacite.org/dois/#{doi}")
          .to_return(status: 200,
                     body: File.read(
                       Rails.root.join('spec/fixtures/data_cite/get_doi_response.json')
                     ),
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'syncs DataCite date to chemotion' do
        syncer.find_and_create_at_chemotion!

        data_cite_device = syncer.converter.data_cite_device
        expect(syncer.converter.chemotion_metadata).to have_attributes(
          doi: doi,
          data_cite_prefix: data_cite_prefix,
          name: data_cite_device.title,
          publisher: data_cite_device.publisher,
          description: data_cite_device.description,
          publication_year: data_cite_device.publication_year,
          url: data_cite_device.url,
          landing_page: data_cite_device.landing_page_url,
          dates: data_cite_device.dates,

          data_cite_version: data_cite_device.metadata_version,
          data_cite_last_response: data_cite_device.raw_response,
          data_cite_created_at: data_cite_device.created,
          data_cite_updated_at: data_cite_device.updated
        )
      end
    end
  end

  describe '#sync_to_data_cite!' do
    before do
      stub_request(:put, "https://api.test.datacite.org/dois/#{doi}")
        .to_return(status: 200,
                   body: File.read(
                     Rails.root.join('spec/fixtures/data_cite/update_doi_response.json')
                   ),
                   headers: { 'Content-Type' => 'application/json' })
    end

    context 'when DOI does not exist on DataCite' do
      before do
        stub_request(:get, "https://api.test.datacite.org/dois/#{doi}")
          .to_return(status: 404,
                     headers: { 'Content-Type' => 'application/json' })

        stub_request(:post, 'https://api.test.datacite.org/dois/')
          .to_return(status: 200,
                     body: File.read(
                       Rails.root.join('spec/fixtures/data_cite/create_doi_response.json')
                     ),
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'syncs chemotion data to DataCite' do
        syncer.sync_to_data_cite!

        expect(syncer.converter.data_cite_device).to have_attributes(
          doi: doi,
          prefix: device_metadata.data_cite_prefix,
          suffix: 'device-test-3',
          title: device_metadata.name,
          publisher: device_metadata.publisher,
          description: device_metadata.description,
          url: device.device_metadata.url,
          landing_page_url: device.device_metadata.landing_page
        )
      end

      it 'syncs some DataCite data to chemotion' do
        syncer.sync_to_data_cite!

        data_cite_device = syncer.converter.data_cite_device
        expect(syncer.converter.chemotion_metadata).to have_attributes(
          data_cite_version: data_cite_device.metadata_version,
          data_cite_last_response: data_cite_device.raw_response,
          data_cite_created_at: data_cite_device.created,
          data_cite_updated_at: data_cite_device.updated
        )
      end
    end

    context 'when DOI exists at DataCite' do
      before do
        stub_request(:get, "https://api.test.datacite.org/dois/#{doi}")
          .to_return(status: 200,
                     body: File.read(
                       Rails.root.join('spec/fixtures/data_cite/get_doi_response.json')
                     ),
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'syncs chemotion data to DataCite' do
        syncer.sync_to_data_cite!

        expect(syncer.converter.data_cite_device).to have_attributes(
          doi: doi,
          prefix: device_metadata.data_cite_prefix,
          suffix: 'device-test-3',
          title: device_metadata.name,
          publisher: device_metadata.publisher,
          description: device_metadata.description,
          url: device.device_metadata.url,
          landing_page_url: device.device_metadata.landing_page
        )
      end

      it 'syncs some DataCite data to chemotion' do
        syncer.sync_to_data_cite!

        data_cite_device = syncer.converter.data_cite_device
        expect(syncer.converter.chemotion_metadata.reload).to have_attributes(
          data_cite_version: data_cite_device.metadata_version,
          data_cite_last_response: data_cite_device.raw_response,
          data_cite_created_at: data_cite_device.created,
          data_cite_updated_at: data_cite_device.updated
        )
      end
    end
  end
end
