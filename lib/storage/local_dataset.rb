require 'storage'

class LocalDataset < Storage
  #store files  in subdirectories named after the parent container_id


  private

  def set_key
    attachment.key = File.join(
      attachment.container_id,
      attachment.filename
    )
  end

  def set_bucket
  end

end
