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
  end
end
