require 'net/sftp'
require 'datahandler'

class RemoteSFTP < DataHandler

  def initialize
    super
    @host = Rails.configuration.storage.host
    @username = Rails.configuration.storage.username
    @password = Rails.configuration.storage.password
  end

  def storage_id
    "remote_sftp"
  end

  def move(created_by, file_id_filename, thumbnail)
    begin
      folder = File.join(@upload_root_folder, created_by.to_s)
      path = File.join(folder, file_id_filename)

      Net::SFTP.start(@host, @username, :password => @password) do |sftp|
        sftp.mkdir! folder
        sftp.upload! path

        if thumbnail
          folder_thumbnail = File.join(folder, @thumbnail_folder)
          path_thumbnail = File.join(folder_thumbnail, file_id_filename + ".png")

          sftp.mkdir! folder_thumbnail
          if File.exists?(path_thumbnail)
            sftp.upload! path_thumbnail
          else
            #thumbnail erzeugen?ß
          end
        end
      end
    rescue Exception => e
      puts "ERROR: Can not copy file to ftp-server: " + e.message
      raise e.message
    end
  end

  def read(attachment)
    begin
      folder = File.join(@upload_root_folder, attachment.created_by.to_s)
      file_id = attachment.identifier + "_" + attachment.filename
      path = File.join(folder, file_id)

      Net::SFTP.start(@host, @username, :password => @password) do |sftp|
        return sftp.download! (path)
      end
    rescue Exception => e
      puts "ERROR: Can not read file from ftp-server: " + e.message
      raise e.message
    end
  end

  def delete(attachment)
  end

  def read_thumbnail(attachment)
  end

private

  def create_thumbnail(created_by, file_path, file_id)
  end

end
