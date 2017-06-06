require 'storage'

class Local < Storage
  attr_reader :data_folder

  def initialize(attach)
    super(attach)
    @config = @store_configs[:local]
    datafolder =  @config[:data_folder]
    if datafolder.blank?
      @data_folder ||= File.join(Rails.root,'tmp', Rails.env, 'uploads')
    elsif datafolder.match(/^\//)
      @data_folder ||= datafolder
    else
      @data_folder ||= File.join(Rails.root, datafolder)
    end
    FileUtils.mkdir_p(data_folder) unless Dir.exist?(data_folder)

  end

  def store_file
    write_file
    add_checksum if File.exist?(path)
  end

  def store_thumb
    write_thumbnail
    File.exist?(thumb_path)
  end

  def read_file
    File.exist?(path) && IO.binread(path) || false
  end

  def read_thumb
    File.exist?(thumb_path) && IO.binread(thumb_path) || false
  end

  def remove_file
    File.exist?(path) && rm_file
    !File.exist?(path)
  end

  def remove_thumb_file
    File.exist?(thumb_path) && rm_thumb_file
    !File.exist?(thumb_path)
  end

  def destroy
    remove_thumb_file
    remove_file
  end

  def path
    raise StandardError, 'cannot build path without attachment key' if attachment.key.blank?
    if attachment.bucket.blank?
      File.join(data_folder, attachment.key.to_s)
    else
      File.join(data_folder, attachment.bucket, attachment.key.to_s)
    end
  end

  def thumb_path
    path + thumb_suffix
  end

  def thumb_suffix
    '.thumb.jpg'
  end

  def thumb_prefix
    ''
  end

  private

  def write_thumbnail
    if (fp = attachment.thumb_path) && File.exist?(fp)
      FileUtils.copy(fp, thumb_path)
    elsif attachment.file_data
      IO.binwrite(thumb_path, attachment.thumb_data)
    end
  end

  def write_file
    set_key
    set_bucket
    write_dir
    begin
      if (fp = attachment.file_path) && File.exist?(fp)
        FileUtils.copy(fp, path)
      elsif attachment.file_data
        IO.binwrite(path, attachment.file_data)
      end
    rescue Exception => e
      puts "ERROR: Can not write local-file: " + e.message
      raise e.message
    end
  end

  def set_key
    attachment.key = attachment.identifier
  end

  def set_bucket
    attachment.bucket = attachment.id / 10000 + 1
  end

  def rm_file
    FileUtils.rm(path, force: true)
  end

  def rm_thumb_file
    FileUtils.rm(thumb_path, force: true)
  end

  def add_checksum
    attachment.checksum = Digest::SHA256.hexdigest(read_file)
  end

  def write_dir
    dirs = [File.dirname(path)]
    dirs << File.dirname(thumb_path) if attachment.thumb
    dirs.each{ |d| FileUtils.mkdir_p(d) unless Dir.exist?(d)}
  end
end
