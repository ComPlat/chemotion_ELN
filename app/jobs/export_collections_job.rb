class ExportCollectionsJob < ActiveJob::Base
  queue_as :export_collections

  def perform(export_id, collection_ids, format, nested)
    export = Export::ExportCollections.new(export_id, collection_ids, format, nested)
    export.prepare_data
    export.to_file
    export.cleanup
  end
end
