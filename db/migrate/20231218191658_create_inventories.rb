class CreateInventories < ActiveRecord::Migration[6.1]
  def change
    create_table :inventories do |t|
      t.string :prefix, null: false
      t.string :name, null: false
      t.integer :counter, default: 0
      t.timestamps
    end
    add_index :inventories, :prefix, unique: true
  end
end