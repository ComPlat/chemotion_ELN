# frozen_string_literal: true

class DatacollectorFolder < DatacollectorObject
  attr_accessor :files

  def collect(device)
    tmpzip = Tempfile.new([@name, '.zip'])
    zip_files(tmpzip)
    register_new_data(device, tmpzip)
  ensure
    tmpzip.close
    tmpzip.unlink
  end

  def delete
    if @sftp
      sftp.session.exec!("rm -rf #{@path}")
    else
      FileUtils.rm_r @path
    end
  end

  private

  def zip_files(tmpzip)
    return if @files.nil?

    if @sftp
      @files.each do |new_file|
        tmpfile = Tempfile.new
        sftp.download!(File.join(path, new_file), tmpfile.path)
        Zip::File.open(tmpzip.path, Zip::File::CREATE) do |zipfile|
          zipfile.add(File.join(@name, new_file), tmpfile.path)
        end
      ensure
        tmpfile.close
        tmpfile.unlink
      end
    else
      Zip::File.open(tmpzip.path, Zip::File::CREATE) do |zipfile|
        @files.each do |new_file|
          zipfile.add(File.join(@name, new_file), File.join(@path, new_file))
        end
      end
    end
  end

  def register_new_data(device, tmpzip)
    att = Attachment.new(
      filename: @name + '.zip',
      created_by: device.id,
      created_for: recipient.id,
      content_type: 'application/zip',
      file_path: tmpzip.path,
    )
    att.save!
    helper = CollectorHelper.new(device, recipient)
    dataset = helper.prepare_new_dataset(@name)
    att.update!(attachable: dataset)
  end
end
