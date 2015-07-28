class CreateCollections < ActiveRecord::Migration
  def change
    create_table :collections do |t|
      t.integer :user_id, null: false, index: true
      t.string :ancestry, index: true
      t.text :label, null: false

      t.timestamps null: false
    end
  end
end
