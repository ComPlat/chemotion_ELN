class AddElementTypeToContainers < ActiveRecord::Migration
  def change
    add_column :containers, :element_type, :string
  end
end
