require 'thread'
require 'digest'
require 'local'

class Storage

  def create(uuid, filename, file, sha256, created_by, created_for)
    begin

      dh = Local.new
      file_id = uuid + "_" + filename
      dh.temp(file_id, file)

      attach = Attachment.new
      attach.identifier = uuid
      attach.filename = filename
      attach.checksum = sha256
      attach.storage = "temp"
      attach.created_by = created_by
      attach.created_for = created_for
      attach.version = 0
      attach.save!
    rescue Exception => e
      puts "ERROR: Can not create attachment " + e.message
    end
  end

  def update(uuid, container_id)
    begin
      dh = Local.new
      attach = Attachment.find_by identifier: uuid

      file_id = attach.identifier + "_" + attach.filename
      dh.move(attach.created_by, file_id, true)

      attach.container_id = container_id
      attach.storage = dh.storage_id
      attach.save!

    rescue Exception => e
      puts "ERROR: Can not update attachment " + e.message
    end
  end

  def read(attachment)
    begin
      dh_local = Local.new

      case attachment.storage
      when dh_local.storage_id
        return dh_local.read(attachment)
      end

    rescue Exception => e
      puts "ERROR: Can not read attachment " + e.message
    end

  end

  def read_thumbnail(attachment)
    begin
      dh_local = Local.new

      case attachment.storage
      when dh_local.storage_id
        return dh_local.read_thumbnail(attachment)
      end
    rescue Exception => e
      puts "ERROR: Can not read thumbnail " + e.message
    end
  end

  def delete(attachment)
    begin
      dh_local = Local.new

      case attachment.storage
      when dh_local.storage_id
        return dh_local.delete(attachment)
      end
    rescue Exception => e
      puts "ERROR: Can not delete attachment " + e.message
    end
  end

  def move(attachment)
    begin
      dh_local = Local.new
      semaphore = Mutex.new

      case attachment.storage
      when dh_local.storage_id
        file_id = attachment.identifier + "_" + attachment.filename
        dh_remote = SFTP.new
          #new Thread{
          #  semaphore.synchronize{
              dh_remote.move(attachment.created_by, file_id, true)
              check = dh_remote.read(attachement)
              if Digest::SHA256.file(check).hexdigest == attachement.checksum
                attachment.storage = dh_remote.storage_id
                attachment.save!
              end
          #  }
          #}
      end
    rescue Exception => e
      puts "ERROR: Can not move attachment " + e.message
    end
  end
end
