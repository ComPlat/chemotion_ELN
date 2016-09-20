class RenameTypeInContainersToContainerType2 < ActiveRecord::Migration
  def change
    rename_column :containers, :type, :container_type
  end
end
