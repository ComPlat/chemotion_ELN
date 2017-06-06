require 'storage'
require 'local'

class LocalUser < Local
  #store files  in subdirectories named after the creator_id

  private

  def set_key
    attachment.key = File.join(
      attachment.created_by,
      attachment.identifier + '-' + attachment.filename
    )
  end

  def set_bucket
  end

end
