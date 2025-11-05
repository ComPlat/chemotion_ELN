class RegenerateAttachmentThumbnails < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def up
    say_with_time("Regenerating thumbnails via Shrine") do
      Attachment.find_each(batch_size: 100) do |attachment|
        begin
          attacher = attachment.attachment_attacher
          new_derivatives = attacher.create_derivatives
          attacher.merge_derivatives(new_derivatives)
          attachment.save!(validate: false)
        rescue => e
          puts "Failed #{attachment.id}: #{e.class} - #{e.message}"
        end
      end
    end
  end
end
