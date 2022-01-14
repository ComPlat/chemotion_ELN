class UpdateAttachmentsWithShrine < ActiveRecord::Migration[5.2]
  def change
    Attachment.where(attachment_data: [nil]).find_each do |item|
      next if item.nil? 
      file_path = item.store.path
      next unless File.exist? file_path


      attachment = { id: file_path, storage: "store", metadata: { size: item.filesize, filename: item.identifier }}
      byebug
      if File.exist? item.store.thumb_path
        thumbnail = { id: file_path, storage: "store", metadata: { size: item.filesize, filename: item.identifier + 'thumb.jpg' }}
        attachment = { id: file_path, storage: "store", metadata: { size: item.filesize, filename: item.identifier }, derivatives: { thumbnail: thumbnail }}
      end
      item[:attachment_data] = attachment
      item.save
    end
  end
end
