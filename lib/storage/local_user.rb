require 'storage'
require 'local'

class LocalUser < Local
  # store files  in subdirectories named after the creator_id
  def thumb_path
    File.join(
      File.dirname(path),
      'thumbnail',
      thumb_prefix + File.basename(path) + thumb_suffix
    )
  end

  private

  def set_key
    attachment.key = File.join(
      attachment.created_by.to_s,
      attachment.identifier + '_' + attachment.filename
    )
  end

  def set_bucket
    attachment.bucket = nil
  end
end
