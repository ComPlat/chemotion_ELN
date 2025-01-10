class RenameFieldsAtDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    rename_column :device_descriptions, :comments, :access_comments
    rename_column :device_descriptions, :tags, :general_tags
  end
end
