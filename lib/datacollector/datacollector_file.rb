class DatacollectorFile < DatacollectorObject
  def collect_from(device)
    if @sftp
      add_attach_to_container(device, attach_remote(device))
    else
      add_attach_to_container(device, attach(device))
    end
  end

  def delete
    @sftp ? @sftp.remove!(@path) : File.delete(@path)
  end

  private

  def attach(device)
    a = Attachment.new(
      filename: @name,
      file_data: IO.binread(@path),
      created_by: device.id,
      created_for: recipient.id
    )
    a.save!
    return a
  end

  def attach_remote(device)
    begin
      tmpfile = Tempfile.new
      @sftp.download!(@path, tmpfile.path)
      a = Attachment.new(
        filename: @name,
        file_data: IO.binread(tmpfile.path),
        created_by: device.id,
        created_for: recipient.id
      )
    ensure
      tmpfile.close
      tmpfile.unlink
    end
    a.save!
    return a
  end

  def add_attach_to_container(device, attach)
    helper = CollectorHelper.new(device, recipient)
    dataset = helper.prepare_dataset(Time.now.strftime('%Y-%m-%d'))
    attach.update_container!(dataset.id)
    primary_store = Rails.configuration.storage.primary_store
    attach.update!(storage: primary_store)

    # add notifications
    channel = Channel.find_by(subject: Channel::INBOX_ARRIVALS_TO_ME)
    return if channel.nil?
    content = channel.msg_template
    return if (content.nil?)
    content['data'] = content['data'] % {:device_name => helper.sender_container.name }

    # check if it is a new message content
    messages = Message.where(channel_id: channel.id, created_by: helper.sender.id).where_content('data', content['data']);
    if messages.empty?
      # message content does not exist, create a new message and notification
      message = Message.create_msg_notification(channel.id, content, helper.sender.id, [recipient.id])
    else
      # check if the notifications are acknowledged
      not_ack_notifications = Notification.where('user_id = (?) AND is_ack = (?) AND message_id in (?)', recipient.id, 0, messages.pluck(:id))
      if not_ack_notifications.empty?
        message = Message.create_msg_notification(channel.id, content, helper.sender.id, [recipient.id])
      end
    end

    attach
  end
end
