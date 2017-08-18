class AddRoleToReaction < ActiveRecord::Migration
  def change
    add_column :reactions, :role, :string
    add_index  :reactions, :role
  end
end
