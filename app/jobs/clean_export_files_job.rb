class CleanExportFilesJob < ActiveJob::Base
    queue_as :clean_export_files

    def perform(job_id, ext)
      file_name = 'public/zip/'+ job_id + '.' + ext
      File.delete(file_name) if File.exist?(file_name)
    end
  end
