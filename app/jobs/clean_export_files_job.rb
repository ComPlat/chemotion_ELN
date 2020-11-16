class CleanExportFilesJob < ApplicationJob
    queue_as :clean_export_files

    def perform(job_id, ext)
      file_path = Rails.public_path.join('zip', job_id + '.' + ext)
      File.delete(file_path) if File.exist?(file_path)
    end
  end
