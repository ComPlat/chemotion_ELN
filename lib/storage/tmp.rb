require 'storage'

class Tmp < Storage
  attr_reader :data_folder

  def initialize(attach)
    super(attach)
    @config = @store_configs[:tmp]
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
    File.exist?(path)
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

  def destroy
    remove_thumb_file
    is_removed = remove_file
    rm_dir unless attachment.bucket.blank?
    is_removed
  end

  def remove_file
    File.exist?(path) && rm_file
    !File.exist?(path)
  end

  def remove_thumb_file
    File.exist?(thumb_path) && rm_thumb_file
    !File.exist?(thumb_path)
  end

  def path
    raise 'cannot build path without attachment key' if attachment.key.blank?
    if !attachment.bucket.blank?
      File.join(data_folder, attachment.bucket, attachment.key )
    else
      File.join(data_folder, attachment.key)
    end
  end

  def thumb_path
    path && path + '.thumb.jpg'
  end

  private

  def write_thumbnail
    fp = if (afp = attachment.file_path) && afp.is_a?(Tempfile)
           afp.path
         else
           afp
         end
    tn = Thumbnailer.create(fp)#, thumb_path)
    #NB issue with Thumbnailer.create(source, destination)
    if tn && tn != thumb_path
      dir = File.dirname(thumb_path)
      FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
      FileUtils.move(tn, thumb_path)
    end
  end

  def write_file
    dir = File.dirname(path)
    FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
    begin
      if (fp = attachment.file_path) && File.exist?(fp)
        FileUtils.copy(fp, path)
      elsif attachment.file_data
        IO.binwrite(path, attachment.file_data)
      end
    rescue Exception => e
      puts "ERROR: Can not write tmp-file: " + e.message
      raise e.message
    end
  end

  def rm_file
    FileUtils.rm(path, force: true)
  end

  def rm_thumb_file
    FileUtils.rm(thumb_path, force: true)
  end

  def rm_dir
    f_dir = File.dirname(path)
    t_dir = File.dirname(thumb_path)
    Dir.rmdir(f_dir )if Dir.exist?(f_dir) && (Dir.entries(f_dir) - %w{ . .. }).empty?
    Dir.rmdir(t_dir )if Dir.exist?(t_dir) && (Dir.entries(t_dir) - %w{ . .. }).empty?
  end

end
