class AddIdentifierToContainers < ActiveRecord::Migration
  def change
    add_column :containers, :identifier, :string
  end
end
