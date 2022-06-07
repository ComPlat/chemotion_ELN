class AddAttachmentDataToAttachments < ActiveRecord::Migration[5.2]
  def change
    add_column :attachments, :attachment_data, :jsonb
<<<<<<< HEAD
    
    Attachment.reset_column_information
=======
>>>>>>> 1277-using-gemshrine-file-service
  end
end