class ExportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :export_collections

  def perform(collection_ids, format, nested, user_id)
    export = Export::ExportCollections.new(self.job_id, collection_ids, format, nested)
    export.prepare_data
    export.to_file
    CleanExportFilesJob.set(queue: "remove_files_#{self.job_id}", wait: 24.hours).perform_later(self.job_id, format)
    CollectionMailer.mail_export_completed(self.job_id, collection_ids, format, user_id).deliver_now
  end
end
