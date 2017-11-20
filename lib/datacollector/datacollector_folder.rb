class DatacollectorFolder < DatacollectorObject
  attr_accessor :files

  def collect(device)
    begin
      tmpzip = Tempfile.new([@name, '.zip'])
      zip_files(tmpzip)
      register_new_data(device, tmpzip)
    ensure
      tmpzip.close
      tmpzip.unlink
    end
  end

  def delete
    if @sftp
      @files.each do |remote_file|
        @sftp.remove! File.join(@path, remote_file)
      end
      sftp.rmdir(@path)
    else
      FileUtils.rm_r @path
    end
  end

  private

  def zip_files(tmpzip)
    if @sftp
      @files.each do |new_file|
        begin
          tmpfile = Tempfile.new
          sftp.download!(File.join(path, new_file), tmpfile.path)
          Zip::File.open(tmpzip.path, Zip::File::CREATE) { |zipfile|
            zipfile.add(File.join(@name, new_file), tmpfile.path)
          }
        ensure
          tmpfile.close
          tmpfile.unlink
        end
      end
    else
      Zip::File.open(tmpzip.path, Zip::File::CREATE) { |zipfile|
        @files.each do |new_file|
          zipfile.add(File.join(@name, new_file), File.join(@path, new_file))
        end
      }
    end
  end

  def register_new_data(device, tmpzip)
    a = Attachment.new(
      filename: @name + '.zip',
      file_data: IO.binread(tmpzip.path),
      created_by: device.id,
      created_for: recipient.id,
      content_type: 'application/zip'
    )
    a.save!
    helper = CollectorHelper.new(device, recipient)
    dataset = helper.prepare_new_dataset(@name)
    a.update!(container_id: dataset.id)
    primary_store = Rails.configuration.storage.primary_store
    a.update!(storage: primary_store)
  end
end
