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
    a = Attachment.new(
      filename: @name,
      file_data: IO.binread(@path),
      content_type: MimeMagic.by_path(@name)&.type,
      created_by: device.id,
      created_for: recipient.id
    )
    a.save!
    a
  end

  def attach_remote(device)
    begin
      tmpfile = Tempfile.new
      @sftp.download!(@path, tmpfile.path)
      a = Attachment.new(
        filename: @name,
        file_data: IO.binread(tmpfile.path),
        content_type: MimeMagic.by_path(@name)&.type,
        created_by: device.id,
        created_for: recipient.id
      )
    ensure
      tmpfile.close
      tmpfile.unlink
    end
    a.save!
    a
  end

  def add_attach_to_container(device, attach, _ = false)
    helper = CollectorHelper.new(device, recipient)
    dataset = helper.prepare_dataset(Time.now.strftime('%Y-%m-%d'))
    attach.update!(attachable: dataset)
    attach.update!(storage: Rails.configuration.storage.primary_store)

    # add notifications
    queue = "inbox_#{device.id}_#{recipient.id}"
    MessageIncomingDataJob.set(queue: queue, wait: 3.minutes).perform_later(
      helper.sender_container.name, helper.sender.id, recipient.id
    ) unless Delayed::Job.find_by(queue: queue)

    attach
  end
end
