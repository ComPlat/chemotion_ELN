class RemoveParentFolderFromContainers < ActiveRecord::Migration
  def change
    remove_column :containers, :parentFolder, :string
  end
end
