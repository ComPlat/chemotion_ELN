class AddAttachmentDataToAttachments < ActiveRecord::Migration[5.2]
  def change
    add_column :attachments, :attachment_data, :jsonb
  end
end