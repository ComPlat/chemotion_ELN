class UpdateAttachmentsWithShrine < ActiveRecord::Migration[5.2]
  def change
    Attachment.where(attachment_data: [nil]).find_each do |att|
      file_path = att.store.path
      next unless File.exist? file_path


      attachment = { id: file_path, storage: "store", metadata: { size: att.filesize, filename: att.identifier }}
      if File.exist? att.store.thumb_path
        thumbnail = { id: file_path, storage: "store", metadata: { size: att.filesize, filename: att.identifier + 'thumb.jpg' }}
        attachment = { id: file_path, storage: "store", metadata: { size: att.filesize, filename: att.identifier }, derivatives: { thumbnail: thumbnail }}
      end
      att[:attachment_data] = attachment
      att.save
    end
  end
end
