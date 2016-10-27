
class Filesystem

  def initialize
    @upload_root_folder = "uploadNew4711"
    @thumbnail_folder = "thumbnails"

    @temp_folder = "temp"
  end

  def temp(file_id, file)
    begin
      FileUtils.mkdir_p(@temp_folder) unless Dir.exist?(@temp_folder)
      path = File.join(@temp_folder, file_id)
      IO.binwrite(path, file)
    rescue Exception => e
      puts "ERROR: Can not write tmp-file: " + e.message
    end
  end

  def move_from_temp_to_storage(user, file_id)
    begin
        folder = File.join(@upload_root_folder, user.id.to_s)
        FileUtils.mkdir_p(folder) unless Dir.exist?(folder)
        path = File.join(folder, file_id)
        tpath = File.join(@temp_folder, file_id)
        FileUtils.mv(tpath, path)
      rescue Exception => e
        puts "ERROR: Can not copy tmp-file to storage: " + e.message
      end
  end

  def read(user, attachment)
    begin
      folder = File.join(@upload_root_folder, user.id.to_s)
      path = File.join(folder, attachment.identifier)

      return IO.binread(path)
    rescue Exception => e
      puts "ERROR: Can not read file: " + e.message
    end
  end

  def delete(user, attachment)
    begin
      folder = File.join(@upload_root_folder, user.id.to_s)
      path = File.join(folder, attachment.identifier)

      File.delete(path)
    rescue Exception => e
      puts "ERROR: Can not delete file: " + e.message
    end
  end





  def create_thumbnail(file_id, file_path)
    begin
      thumbnail_path = Thumbnailer.create(file_path)
      FileUtils.mv(thumbnail_path, File.join(@upload_root_folder, @thumbnail_folder, "#{file_id}.png"))
    rescue
      #Thumbnail konnte nicht erzeugt werden
      puts "Thumbnail Fehler !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    end
  end
end
