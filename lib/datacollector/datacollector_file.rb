# frozen_string_literal: true

# A class as a file data collector
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
    att = Attachment.new(
      filename: @name,
      file_data: IO.binread(@path),
      content_type: MimeMagic.by_path(@name)&.type,
      created_by: device.id,
      created_for: recipient.id,
      file_path: @path,
    )
    att.save!

    att
  end

  def attach_remote(device)
    begin
      tmpfile = Tempfile.new
      @sftp.download!(@path, tmpfile.path)
      att = Attachment.new(
        filename: @name,
        file_path: tmpfile.path,
        content_type: MimeMagic.by_path(@name)&.type,
        created_by: device.id,
        created_for: recipient.id,
      )
      att.save!
    ensure
      tmpfile.close
      tmpfile.unlink
    end

    att
  end

  def add_attach_to_container(device, attach, _ = false)
    helper = CollectorHelper.new(device, recipient)
    dataset = helper.prepare_dataset(Time.now.strftime('%Y-%m-%d'))
    attach.update!(attachable: dataset)
    attach.update!(storage: Rails.configuration.storage.primary_store)

    # add notifications
    queue = "inbox_#{device.id}_#{recipient.id}"
    unless Delayed::Job.find_by(queue: queue)
      MessageIncomingDataJob.set(queue: queue, wait: 3.minutes).perform_later(
        helper.sender_container.name, helper.sender.id, recipient.id
      )
    end

    attach
  end
end
