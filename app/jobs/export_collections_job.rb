class ExportCollectionsJob < ActiveJob::Base
  queue_as :export_collections

  # rescue_from(ActiveRecord::RecordNotFound) do; end

  before_enqueue do |job|
    # create lock file
    File.open(lock_file_name(job.arguments.first, job.job_id), 'w') {}
  end

  after_perform do |job|
    # remove lock file
    lock_file_name = lock_file_name(job.arguments.first, job.job_id)
    File.delete(lock_file_name) if File.exist?(lock_file_name)
  end

  def perform(fmt, collection_ids)
    # prepare the collections for export
    export = Export::ExportCollections.new
    export.prepare_data collection_ids

    case fmt
    when 'json'
      # write the json file public/json/
      File.write(file_name(fmt, self.job_id), export.to_json())
    when 'zip'
      # create a zip buffer
      zip = Zip::OutputStream.write_buffer do |zip|
        # write the json file into the zip file
        zip.put_next_entry File.join(self.job_id, 'data.json')
        zip.write export.to_json()

        # write all attachemnts into an attachments directory
        export.attachments.each do |attachment|
          zip.put_next_entry File.join(self.job_id, 'attachments', attachment.filename)
          zip.write attachment.read_file
        end
      end
      zip.rewind

      # write the zip file to public/zip/
      File.write(file_name(fmt, self.job_id), zip.read)
    end
  end

  private

  def file_name(fmt, job_id)
    return File.join('public', fmt, "#{job_id}.#{fmt}")
  end

  def lock_file_name(fmt, job_id)
    return file_name(fmt, job_id) + '.lock'
  end
end
