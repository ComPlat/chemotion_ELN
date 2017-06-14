require 'storage'

class LocalDataset < Local
  # store files  in subdirectories named after the parent container_id

  private

  def set_key
    attachment.key = File.join(
      attachment.container_id.to_s,
      attachment.filename
    )
  end

  def set_bucket
    attachment.bucket = nil
  end
end
