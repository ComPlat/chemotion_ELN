class CreateInventory < ActiveRecord::Migration[5.2]
  def change
    create_table :inventories do |t|
      t.jsonb :inventory_parameters
      t.integer :inventoriable_id
      t.string :inventoriable_type
    end
    add_index :inventories, [:inventoriable_type, :inventoriable_id]
  end
end