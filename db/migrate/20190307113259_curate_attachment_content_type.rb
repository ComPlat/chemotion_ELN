class CurateAttachmentContentType < ActiveRecord::Migration
  def change
    Attachment.where(content_type: nil).find_each do |attachment|
      m =  begin MimeMagic.by_path(attachment.filename)
           rescue
             nil
           end
      next unless m
      if m.mediatype == 'image' || m.subtype == 'pdf'
        attachment.update_columns(content_type: m.type)
      end
      # puts "#{attachment.filename}: #{m.type} - #{attachment.content_type}\n"
    end    
  end
end
