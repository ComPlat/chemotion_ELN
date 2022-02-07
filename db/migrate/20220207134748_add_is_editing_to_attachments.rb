class AddIsEditingToAttachments < ActiveRecord::Migration[5.2]
  def change
    add_column :attachments, :is_editing, :bool, default: false
  end
end
