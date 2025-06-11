class AddDeletedAtToAttachments < ActiveRecord::Migration[6.1]
  def change
    add_column :attachments, :deleted_at, :datetime
  end
end
