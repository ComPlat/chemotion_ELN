class AddDescriptionToContainers < ActiveRecord::Migration
  def change
    add_column :containers, :description, :text
  end
end
