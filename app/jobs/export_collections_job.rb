class ExportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :export_collections

  after_perform do |job|
    if @success
      # Sweep file in 24h
      CleanExportFilesJob.set(queue: "remove_files_#{job.job_id}", wait: 24.hours)
                         .perform_later(job.job_id, @extname)

      # Email ELNer
      CollectionMailer.mail_export_completed(
        @user_id,
        @labels,
        @link,
        @expires_at
      ).deliver_now

      # Notify ELNer
      channel = Channel.find_by(subject: Channel::COLLECTION_ZIP)
      content = channel.msg_template unless channel.nil?
      if content.present?
        content['data'] = format(
          content['data'],
          { col_labels: "[#{@labels.join('], [')}]"[0..40], operation: 'export' }
        )
        content['url'] = @link
        content['url_title'] = 'Download'
        Message.create_msg_notification(channel.id, content, @user_id, [@user_id])
      end
    end
  end

  def perform(collection_ids, extname, nested, user_id)
    @success = true
    @collection_ids = collection_ids
    @extname = extname
    @user_id = user_id
    begin
      @labels = Collection.where(id: collection_ids[0..9]).pluck(:label)
      @link = if Rails.env.production?
                "https://#{ENV['HOST'] || ENV['SMTP_DOMAIN']}/zip/#{job_id}.#{extname}"
              else
                "http://#{ENV['HOST'] || 'localhost:3000'}/zip/#{job_id}.#{extname}"
              end
      @expires_at = Time.now + 24.hours

      export = Export::ExportCollections.new(job_id, collection_ids, extname, nested)
      export.prepare_data
      export.to_file
    rescue StandardError => e
      Delayed::Worker.logger.error e
      # TODO: Notify Elner
      fp = Rails.public_path.join(@extname, "#{job_id}.#{@extname}" )
      File.delete(fp) if File.exist?(fp)
      @success = false
    end
  end
end
