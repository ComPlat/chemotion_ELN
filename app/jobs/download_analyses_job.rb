class DownloadAnalysesJob < ApplicationJob
  include ActiveJob::Status

  queue_as :download_analyses

  after_perform do |job|
    if @rt == false
      begin
        CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 24.hours)
                          .perform_later(job.job_id, 'zip')

        # Notify ELNer
        Message.create_msg_notification(
          channel_subject: Channel::DOWNLOAD_ANALYSES_ZIP,
          data_args: { expires_at: @expires_at, sample_name: @sample.short_label },
          message_from: @user_id,
          url: @link
        )

        AnalysesMailer.mail_export_completed(
          @user_id,
          @sample.short_label,
          @link,
          @expires_at
        ).deliver_now
      rescue StandardError => e
        Delayed::Worker.logger.error e
      end if @success
    end
  end

  def perform(sid, user_id, rt=true)
    @sample = Sample.find(sid)
    @filename = "#{job_id}.zip"
    @rt = rt
    @success = true
    @user_id = user_id
    @file_path = Rails.public_path.join('zip', @filename)

    begin
      @link = if Rails.env.production?
        "https://#{ENV['HOST'] || ENV['SMTP_DOMAIN']}/zip/#{@filename}"
      else
        "http://#{ENV['HOST'] || 'localhost:3000'}/zip/#{@filename}"
      end
      @expires_at = Time.now + 24.hours

      zip = Zip::OutputStream.write_buffer do |zip|

        @sample.analyses.each do |analysis|
          analysis.children.each do |dataset|
            dataset.attachments.each do |att|
              zip.put_next_entry att.filename
              zip.write att.read_file
            end
          end
        end

        zip.put_next_entry "sample_#{@sample.short_label} analytical_files.txt"
        zip.write <<~DESC
        sample short label: #{@sample.short_label}
        sample id: #{@sample.id}
        analyses count: #{@sample.analyses&.length || 0}

        Files:
        DESC

        @sample.analyses&.each do |analysis|
          zip.write "analysis name: #{analysis.name}\n"
          zip.write "analysis type: #{analysis.extended_metadata.fetch('kind', nil)}\n\n"
          analysis.children.each do |dataset|
            zip.write "dataset: #{dataset.name}\n"
            zip.write "instrument: #{dataset.extended_metadata.fetch('instrument', nil)}\n\n"
            dataset.attachments.each do |att|
              zip.write "#{att.filename}   #{att.checksum}\n"
            end
          end
          zip.write "\n"
        end
      end

      if rt == false
        zip.rewind
        File.write(@file_path, zip.read)
      end
    rescue StandardError => e

    end
    zip
  end
end