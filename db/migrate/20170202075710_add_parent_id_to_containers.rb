class AddParentIdToContainers < ActiveRecord::Migration[4.2]
  def change
    add_column :containers, :parent_id, :integer
  end
end
