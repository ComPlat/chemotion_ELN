class RenameFileTypeNameToiFileTypes < ActiveRecord::Migration[6.1]
  def change
    rename_column :third_party_apps, :file_type, :file_types
  end
end
