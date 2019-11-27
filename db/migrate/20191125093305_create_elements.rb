class CreateElements < ActiveRecord::Migration
  def change
    create_table :element_klasses do |t|
      t.string :name
      t.string :label
      t.string :desc
      t.string :icon_name
      t.jsonb :properties_template
      t.integer :created_by
      t.datetime :created_at
      t.datetime :updated_at
    end
    create_table :elements do |t|
      t.string :name
      t.integer :element_klass_id
      t.jsonb :properties
      t.integer :created_by
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end

    create_table :collections_elements do |t|
      t.integer :collection_id
      t.integer :element_id
      t.index :collection_id
      t.index :element_id
      t.datetime :deleted_at
    end

    #add_column :collections, :element_detail_level, :integer, default: 10
    #add_column :sync_collections_users, :element_detail_level, :integer, default: 10
  end
end
