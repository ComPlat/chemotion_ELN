class AddAttachmentDataToAttachments < ActiveRecord::Migration[5.2]
  def change
    add_column :attachments, :attachment_data, :jsonb
    
    Attachment.reset_column_information
  end
end