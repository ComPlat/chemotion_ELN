
class Filesystem

  def initialize
    @upload_root_folder = "uploadNew"
    @thumbnail_folder = "thumbnails"

    @temp_folder = "temp"
  end

  def temp(file_id_filename, file)
    begin
      FileUtils.mkdir_p(@temp_folder) unless Dir.exist?(@temp_folder)
      path = File.join(@temp_folder, file_id_filename)
      IO.binwrite(path, file)
    rescue Exception => e
      puts "ERROR: Can not write tmp-file: " + e.message
    end
  end

  def move_from_temp_to_storage(user, file_id_filename, thumbnail)
    begin
        folder = File.join(@upload_root_folder, user.id.to_s)
        FileUtils.mkdir_p(folder) unless Dir.exist?(folder)

        dest_path = File.join(folder, file_id_filename)

        source_path = File.join(@temp_folder, file_id_filename)
        FileUtils.mv(source_path, dest_path)

        if thumbnail
          create_thumbnail(user, dest_path, file_id_filename)
        end

      rescue Exception => e
        puts "ERROR: Can not copy tmp-file to storage: " + e.message
        raise e.message
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


private

  def create_thumbnail(user, file_path, file_id)
    begin
      dest_folder = File.join(@upload_root_folder, user.id.to_s, @thumbnail_folder)
      FileUtils.mkdir_p(dest_folder) unless Dir.exist?(dest_folder)

      thumbnail_path = Thumbnailer.create(file_path)

      puts "!!!!!!!!!!!!!!!!!!!! TM PATH " + thumbnail_path

      dest = File.join(dest_folder, "#{file_id}.png")

      puts "!!!!!!!!!!!!!!!!!!!!!!! DEST " + dest

      if thumbnail_path && File.exists?(thumbnail_path)
        FileUtils.mv(thumbnail_path, dest)
      end
    rescue Exception => e
      puts "ERROR: Can not create thumbnail: " + e.message
    end
  end
end
