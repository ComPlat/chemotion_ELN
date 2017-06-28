class AddFolderToAttachment < ActiveRecord::Migration
  def change
    add_column :attachments, :folder, :string unless column_exists? :attachments, :folder
  end
end
