require 'storage'

class Tmp < Local

  def store_file
    write_file
    File.exist?(path)
  end

  def destroy
    remove_thumb_file
    is_removed = remove_file
    rm_dir unless attachment.bucket.blank?
    is_removed
  end

  private

  def write_thumbnail
    fp = if (afp = attachment.file_path) && afp.is_a?(Tempfile)
           afp.path
         else
           afp
         end
    return if fp.blank? || (fe = File.extname(fp)&.downcase).blank?
    # wa for issue with 'jpeg' extension
    fe = '.jpg' if fe == '.jpeg'
    tmp = Tempfile.new([File.basename(fp, '.*'), fe], encoding: 'ascii-8bit')
    tmp.write File.read(fp)
    tmp.rewind
    tn = Thumbnailer.create(tmp.path)#, thumb_path)
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

  def set_key
  end

  def set_bucket
  end

  def rm_dir
    f_dir = File.dirname(path)
    t_dir = File.dirname(thumb_path)
    Dir.rmdir(f_dir )if Dir.exist?(f_dir) && (Dir.entries(f_dir) - %w{ . .. }).empty?
    Dir.rmdir(t_dir )if Dir.exist?(t_dir) && (Dir.entries(t_dir) - %w{ . .. }).empty?
  end

end
