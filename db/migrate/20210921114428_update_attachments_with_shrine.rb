class UpdateAttachmentsWithShrine < ActiveRecord::Migration[5.2]
  def change
<<<<<<< HEAD
<<<<<<< HEAD
    Attachment.reset_column_information
    
    Attachment.where(attachment_data: [nil]).find_each do |item|
=======
    Attachment.where(attachment_data: [nil]).find_each do |item|
      next if item.nil? 
>>>>>>> 1277-using-gemshrine-file-service
      file_path = item.store.path
      next unless File.exist? file_path
      item.attachment_attacher.attach(File.open(file_path, binmode: true))
      if item.valid?
        item.attachment_attacher.create_derivatives
        item.save!
      else
        File.write('failed_attachement_migrate.log', "#{item.id}: File_path: #{file_path}  Message: #{item.errors.to_h[:attachment]}\n", mode: 'a')
      end
=======
    Attachment.where(attachment_data: [nil]).find_each do |item|
      next if item.nil? 
      file_path = item.store.path
      next unless File.exist? file_path


      attachment = { id: file_path, storage: "store", metadata: { size: item.filesize, filename: item.identifier }}
      if File.exist? item.store.thumb_path
        thumbnail = { id: file_path, storage: "store", metadata: { size: item.filesize, filename: item.identifier + 'thumb.jpg' }}
        attachment = { id: file_path, storage: "store", metadata: { size: item.filesize, filename: item.identifier }, derivatives: { thumbnail: thumbnail }}
      end
      item[:attachment_data] = attachment
      item.save
>>>>>>> 1277-using-gemshrine-file-service
    end
  end
end
