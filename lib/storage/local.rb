require 'storage'

class Local < Storage
  attr_reader :data_folder

  def initialize(attach)
    super
    datafolder = @store_config[:data_folder]
    @data_folder ||= if datafolder.blank?
                       Rails.root.join('tmp', Rails.env, 'uploads').to_s
                     elsif datafolder.match?(%r{^/})
                       datafolder
                     else
                       File.join(Rails.root, datafolder)
                     end
    FileUtils.mkdir_p(data_folder) unless Dir.exist?(data_folder)
  end

  def file_exist?
    File.exist?(path)
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
    (File.exist?(path) && File.binread(path)) || false
  end

  def read_thumb
    (File.exist?(thumb_path) && File.binread(thumb_path)) || false
  end

  def destroy(at_previous_path = false)
    remove_thumb_file(at_previous_path)
    remove_file(at_previous_path)
  end

  def remove_file(at_previous_path = false)
    pat = (at_previous_path && prev_path) || path
    File.exist?(pat) && rm_file(pat)
    !File.exist?(pat)
  end

  def remove_thumb_file(at_previous_path = false)
    pat = (at_previous_path && prev_thumb_path) || thumb_path
    File.exist?(pat) && rm_file(pat)
    !File.exist?(pat)
  end

  def path(bucket = attachment.bucket, key = attachment.key)
    raise StandardError, 'cannot build path without attachment key' if attachment.key.blank?

    if bucket.blank?
      File.join(data_folder, key.to_s)
    else
      File.join(data_folder, bucket, key.to_s)
    end
  end

  def thumb_path(*arg)
    path(*arg) + thumb_suffix
  end

  def prev_path
    path(attachment.bucket_was, attachment.key_was)
  end

  def prev_thumb_path
    thumb_path(attachment.bucket_was, attachment.key_was)
  end

  def thumb_suffix
    '.thumb.jpg'
  end

  def thumb_prefix
    ''
  end

  def add_checksum
    # attachment.checksum = File.open(path, 'rb') { |f| Digest::MD5.hexdigest(f.read) }
    attachment.checksum = File.open(path, 'rb') do |io|
      dig = Digest::MD5.new
      buf = ''
      dig.update(buf) while io.read(4096, buf)
      dig
    end
  end

  private

  def write_thumbnail
    create_thumb_dir
    if (fp = attachment.thumb_path) && File.exist?(fp)
      FileUtils.copy(fp, thumb_path)
    elsif attachment.thumb_data
      File.binwrite(thumb_path, attachment.thumb_data)
    end
  end

  def write_file
    set_key
    set_bucket
    target_path = path
    create_dirs(target_path)
    begin
      if (fp = attachment.file_path) && File.exist?(fp)
        FileUtils.copy(fp, target_path)
      elsif attachment.file_data
        File.binwrite(target_path, attachment.file_data)
      end
    rescue StandardError => e
      puts "ERROR: Can not write local-file: #{e.class} - #{e.message}"
      raise
    end
  end

  def set_key
    attachment.key = attachment.identifier
  end

  def set_bucket
    attachment.bucket = (attachment.id / 10_000) + 1
  end

  def rm_file(path_to_file)
    FileUtils.rm(path_to_file, force: true)
  end

  def create_dirs(target_path)
    dirs = [File.dirname(target_path)]
    dirs << File.dirname(thumb_path) if attachment.thumb && thumb_path.present?
    dirs.each { |d| FileUtils.mkdir_p(d) }
  end

  def create_thumb_dir
    return unless attachment.thumb

    d = File.dirname(thumb_path)
    FileUtils.mkdir_p(d)
  end
end
