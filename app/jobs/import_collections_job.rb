class ImportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :import_collections

  after_perform do |job|
    if @success
      channel = Channel.find_by(subject: Channel::COLLECTION_ZIP)
      content = channel.msg_template unless channel.nil?
      if content.present?
        content['data'] = format(content['data'], { col_labels: '',  operation: 'import'})
        content['data'] = content['data'] + ' File: ' + filename
        Message.create_msg_notification(channel.id, content,  @user_id, [@user_id])
      end
    end
  end

  def perform(att, current_user_id)
    @user_id = current_user_id
    @success = true
    begin
      import = Import::ImportCollections.new(att, current_user_id)
      import.extract
      import.import!
    rescue => e
      Delayed::Worker.logger.error e
      # TODO: Message Error
      @success = false
    end
  end
end
