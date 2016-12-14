
class Local

  def initialize
    @upload_root_folder = Rails.configuration.storage.root_folder
    @thumbnail_folder = "thumbnails"

    @temp_folder = "temp"
  end

  def storage_id
    "local"
  end

  def temp(file_id_filename, file)
    begin
      FileUtils.mkdir_p(@temp_folder) unless Dir.exist?(@temp_folder)
      path = File.join(@temp_folder, file_id_filename)
      IO.binwrite(path, file)
    rescue Exception => e
      puts "ERROR: Can not write tmp-file: " + e.message
      raise e.message
    end
  end

  def move_from_temp(created_by, file_id_filename, thumbnail)
    begin
        folder = File.join(@upload_root_folder, created_by.to_s)
        FileUtils.mkdir_p(folder) unless Dir.exist?(folder)

        dest_path = File.join(folder, file_id_filename)

        source_path = File.join(@temp_folder, file_id_filename)
        FileUtils.mv(source_path, dest_path)

        if thumbnail
          create_thumbnail(created_by, dest_path, file_id_filename)
        end

      rescue Exception => e
        puts "ERROR: Can not copy tmp-file to storage: " + e.message
        raise e.message
      end
  end

  def read(attachment)
    begin
      folder = File.join(@upload_root_folder, attachment.created_by.to_s)
      file_id = attachment.identifier + "_" + attachment.filename
      path = File.join(folder, file_id)

      return IO.binread(path)
    rescue Exception => e
      puts "ERROR: Can not read file: " + e.message
      raise e.message
    end
  end

  def delete(attachment)
    begin
      folder = File.join(@upload_root_folder, attachment.created_by.to_s)
      file_id = attachment.identifier + "_" + attachment.filename
      path = File.join(folder, file_id)

      File.delete(path)

      folder_thumbnail = File.join(@upload_root_folder, attachment.created_by.to_s, @thumbnail_folder)
      thumbnail_id = attachment.identifier + "_" + attachment.filename + ".png"
      path_thumbnail = File.join(folder_thumbnail, thumbnail_id)

      if File.exist?(path_thumbnail)
        File.delete(path_thumbnail)
      end
    rescue Exception => e
      puts "ERROR: Can not delete file: " + e.message
    end
  end

  def read_thumbnail(attachment)
    begin
      folder = File.join(@upload_root_folder, attachment.created_by.to_s, @thumbnail_folder)
      thumbnail_id = attachment.identifier + "_" + attachment.filename + ".png"
      path = File.join(folder, thumbnail_id)

      if File.exist?(path)
        Base64.encode64(File.open(path, 'rb').read)
      else
        nil
      end
    rescue
      puts "ERROR: Can not read thumbnail: " + e.message
    end
  end

private

  def create_thumbnail(created_by, file_path, file_id)
    begin
      dest_folder = File.join(@upload_root_folder, created_by.to_s, @thumbnail_folder)
      FileUtils.mkdir_p(dest_folder) unless Dir.exist?(dest_folder)

      thumbnail_path = Thumbnailer.create(file_path)

      dest = File.join(dest_folder, "#{file_id}.png")

      if thumbnail_path && File.exists?(thumbnail_path)
        FileUtils.mv(thumbnail_path, dest)
      end
    rescue Exception => e
      puts "ERROR: Can not create thumbnail: " + e.message
    end
  end

end
