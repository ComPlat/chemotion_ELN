class AddIndexToContainersOnName < ActiveRecord::Migration[6.1]
  def change
    add_index :containers, :name
  end
end
