class CurateAttachmentContentType < ActiveRecord::Migration[4.2]
  def change
    Attachment.where(content_type: nil).find_each do |attachment|
      next if attachment.nil?
      m =  begin MimeMagic.by_path(attachment.filename)
           rescue
             nil
           end
      next unless m
      if m.mediatype == 'image' || m.subtype == 'pdf'
        attachment.update_columns(content_type: m.type)
      end
    end    
  end
end
