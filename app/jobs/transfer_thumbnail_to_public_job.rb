class TransferThumbnailToPublicJob < ActiveJob::Base
  queue_as :transfer_thumbnail_to_public

  def perform(attach_ary)
    begin
      attach_ary.each do |attach_id|
        a = Attachment.find(attach_id)
        file_path = Rails.public_path.join('images', 'thumbnail', a.identifier)
        if a.read_thumbnail
          rp = ResearchPlan.find(a.attachable_id)
          #rp.update!(thumb_svg: '/images/thumbnail/' + a.identifier) unless rp.nil?
          File.write(file_path, a.read_thumbnail.force_encoding("UTF-8"))
        end
      end
    end
  end
end
