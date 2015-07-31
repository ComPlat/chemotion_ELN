class CreateCollections < ActiveRecord::Migration
  def change
    create_table :collections do |t|
      t.integer :user_id, null: false, index: true
      t.string :ancestry, index: true
      t.text :label, null: false

      t.timestamps null: false
    end

    create_table :samples do |t|
      t.string :name

      t.timestamps null: false
    end

    create_join_table :collections, :samples do |t|
      t.index :collection_id
      t.index :sample_id
    end
  end
end
