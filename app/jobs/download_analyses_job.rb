# frozen_string_literal: true

class DownloadAnalysesJob < ApplicationJob
  include ActiveJob::Status

  queue_as :download_analyses

  after_perform do |job|
    if @rt == false && @success
      begin
        CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 24.hours)
                           .perform_later(job.job_id, 'zip')

        # Notify ELNer
        Message.create_msg_notification(
          channel_subject: Channel::DOWNLOAD_ANALYSES_ZIP,
          data_args: { expires_at: @expires_at, element_name: @element.short_label },
          message_from: @user_id,
          url: @link,
        )

        AnalysesMailer.mail_export_completed(
          @user_id,
          @element.short_label,
          @link,
          @expires_at,
        ).deliver_now
      rescue StandardError => e
        Delayed::Worker.logger.error e
      end
    end
  end

  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/CyclomaticComplexity
  # rubocop:disable Metrics/MethodLength
  # rubocop:disable Metrics/PerceivedComplexity
  # rubocop:disable Style/OptionalBooleanParameter

  def perform(id, user_id, ret = true, element = 'sample')
    @element = element.camelize.constantize.find(id)
    @filename = "#{job_id}.zip"
    @rt = ret
    @success = true
    @user_id = user_id
    @file_path = Rails.public_path.join('zip', @filename)

    begin
      @link = "#{Rails.application.config.root_url}/zip/#{@filename}"
      @expires_at = 24.hours.from_now

      zip_file = Zip::OutputStream.write_buffer do |zip|
        @element.analyses.each do |analysis|
          analysis.children.each do |dataset|
            dataset.attachments.each do |att|
              zip.put_next_entry att.filename
              zip.write att.read_file
            end
          end
        end

        zip.put_next_entry "#{element}_#{@element.short_label} analytical_files.txt"
        zip.write <<~DESC
          #{element} short label: #{@element.short_label}
          #{element} id: #{@element.id}
          analyses count: #{@element.analyses&.length || 0}

          Files:
        DESC

        @element.analyses&.each do |analysis|
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
        zip_file.rewind
        File.write(@file_path, zip_file.read)
      end
    rescue StandardError => e
      Delayed::Worker.logger.error e
    end
    zip_file
  end
  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/CyclomaticComplexity
  # rubocop:enable Metrics/MethodLength
  # rubocop:enable Metrics/PerceivedComplexity
  # rubocop:enable Style/OptionalBooleanParameter
end
