class ImportCollectionsJob < ActiveJob::Base
  include ActiveJob::Status

  queue_as :import_collections

  def perform(import_id, filename, current_user_id)
    import = Import::ImportCollections.new(import_id, current_user_id)
    import.extract
    import.read
    import.import
    import.cleanup

    channel = Channel.find_by(subject: Channel::COLLECTION_ZIP)
    content = channel.msg_template unless channel.nil?
    return if content.nil?

    content['data'] = format(content['data'], { col_labels: '',  operate: 'imported'})
    content['data'] = content['data'] + ' File: ' + filename
    Message.create_msg_notification(channel.id, content,  current_user_id, [current_user_id])

  end
end
