require 'storage'

class LocalDataset < Local
  # store files  in subdirectories named after the parent attachable info

  private

  def set_key
    attachment.key = File.join(
      attachment.attachable_id.to_s,
      attachment.attachable_type,
      attachment.filename
    )
  end

  def set_bucket
    attachment.bucket = nil
  end
end
