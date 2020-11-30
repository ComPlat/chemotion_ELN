class AddFolderToAttachment < ActiveRecord::Migration[4.2]
  def change
    add_column :attachments, :folder, :string unless column_exists? :attachments, :folder
  end
end
