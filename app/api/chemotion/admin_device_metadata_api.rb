# frozen_string_literal: true

module Chemotion
  class AdminDeviceMetadataAPI < Grape::API
    resource :admin_device_metadata do
      before do
        error!(401) unless current_user.is_a?(Admin)
      end
      # Get deviceMetadata by device id
      params do
        requires :device_id, type: Integer, desc: 'device id'
      end
      route_param :device_id do
        get do
          present DeviceMetadata.find_by(device_id: params[:device_id]), with: Entities::DeviceMetadataEntity,
                                                                         root: 'device_metadata'
        end
      end

      # Synchronize chemotion deviceMetadata to DataCite
      params do
        requires :device_id, type: Integer, desc: 'device id'
      end
      route_param :device_id do
        put 'sync_to_data_cite' do
          device = Device.find(params[:device_id])
          DataCite.sync_to_data_cite!(device)
          present device.device_metadata, with: Entities::DeviceMetadataEntity, root: 'device_metadata'
        rescue DataCite::Client::NotFoundError
          present(error: "Error from DataCite: The resource you are looking for doesn't exist.")
        rescue DataCite::Client::UnprocessableEntity => e
          present(error: "Error from DataCite: #{e.message}")
        rescue DataCite::Syncer::UnwriteableDoiPrefixError
          present(error: "DOI #{device.device_metadata.doi} is not writeable at DataCite (system prefix: #{ENV.fetch(
            'DATA_CITE_PREFIX', nil
          )})")
        end
      end

      # create/update device metadata
      params do
        requires :device_id, type: Integer, desc: 'device id'

        optional :name, type: String, desc: 'device name'
        optional :doi, type: String, desc: 'device doi'
        optional :url, type: String, desc: 'device url'
        optional :landing_page, type: String, desc: 'device landing_page'
        optional :type, type: String, desc: 'device type'
        optional :description, type: String, desc: 'device description'
        optional :publisher, type: String, desc: 'device publisher'
        optional :publication_year, type: Integer, desc: 'device publication year'
        optional :data_cite_state, type: String, desc: 'state'
        optional :owners, desc: 'device owners'
        optional :manufacturers, desc: 'device manufacturers'
        optional :dates, desc: 'device dates'
      end
      post do
        attributes = declared(params, include_missing: false)
        metadata = DeviceMetadata.find_or_initialize_by(device_id: attributes[:device_id])
        new_record = metadata.new_record?
        metadata.update!(attributes)
        DataCite.find_and_create_at_chemotion!(metadata.device) if new_record
        present metadata.reload, with: Entities::DeviceMetadataEntity, root: 'device_metadata'
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end
    end
  end
end
