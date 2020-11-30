class AddRoleToReaction < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions, :role, :string
    add_index  :reactions, :role
  end
end
