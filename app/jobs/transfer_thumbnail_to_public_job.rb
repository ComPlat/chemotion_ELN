# frozen_string_literal: true

# Job to transfer thumbnail to public
class TransferThumbnailToPublicJob < ApplicationJob
  queue_as :transfer_thumbnail_to_public
  def perform(attach_ary)
    attach_ary.each do |attach_id|
      a = Attachment.find_by(id: attach_id)
      next unless a

      file_path = Rails.public_path.join('images', 'thumbnail', a.identifier)
      File.write(file_path, a.read_thumbnail.force_encoding('UTF-8')) if a.read_thumbnail
    end
  end
end
