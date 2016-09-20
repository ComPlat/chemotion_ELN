class AddAncestryToContainers < ActiveRecord::Migration
  def change
    add_column :containers, :ancestry, :string
  end
end
