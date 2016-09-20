class AddTypeToContainers < ActiveRecord::Migration
  def change
    add_column :containers, :type, :string
  end
end
