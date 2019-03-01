class ExportCollectionJob < ActiveJob::Base
  queue_as :export_collection

  rescue_from(ActiveRecord::RecordNotFound) do; end

  def perform(collection_ids)
    export_file_name = "#{self.job_id}.json"
    export_file_name = File.join('public', 'json', export_file_name)

    export = Export::ExportCollectionJson.new collection_ids
    export.prepare_data.to_file(export_file_name)
  end
end
