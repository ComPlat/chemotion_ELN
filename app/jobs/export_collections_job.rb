class ExportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :export_collections

  def perform(collection_ids, format, nested)
    export = Export::ExportCollections.new(self.job_id, collection_ids, format, nested)
    export.prepare_data
    export.to_file
  end
end
