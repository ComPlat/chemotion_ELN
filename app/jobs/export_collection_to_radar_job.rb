class ExportCollectionToRadarJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :export_collection_to_radar

  def perform(access_token, collection_id, dataset_id)
    @success = true
    @access_token = access_token
    @collection_id = collection_id
    @dataset_id = dataset_id

    begin
      # create the collection export
      export = Export::ExportCollections.new(job_id, [@collection_id], 'zip', true)
      export.prepare_data
      export.to_file

      # upload the file to radar
      file_id = Oauth2::Radar::store_file(@access_token, @dataset_id, export.file_path)

      # store the metainformation about the dataset and the file in radar in the collection metadata
      collection = Collection.find(@collection_id)
      collection.metadata.set_radar_ids(@dataset_id, file_id)
    rescue StandardError => e
      Delayed::Worker.logger.error e
      @success = false
    end
  end
end
