require 'digest'
require 'local'

class Storage

  def create(uuid, filename, file, created_by, created_for)
    begin
      dh = Local.new
      file_id = uuid + "_" + filename
      dh.temp(file_id, file)

      #md5 = Digest::MD5.file file
      #puts "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! " + md5.hexdigest

      attach = Attachment.new
      attach.identifier = uuid
      attach.filename = filename
      attach.checksum = "todo" #md5.hexdigest
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
      dh.move_from_temp(attach.created_by, file_id, true)

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
    dh_local = Local.new

    case attachment.storage
    when dh_local.storage_id
      return dh_local.read_attachment(attachment)
    end
  end

  def delete(attachment)
    dh_local = Local.new

    case attachment.storage
    when dh_local.storage_id
      return dh_local.delete(attachment)
    end
  end
end
