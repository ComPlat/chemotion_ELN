# frozen_string_literal: true

# Create generic elements
class GenericElements < ActiveRecord::Migration[4.2]
  def self.up
    unless table_exists? :element_klasses
      create_table :element_klasses do |t|
        t.string :name
        t.string :label
        t.string :desc
        t.string :icon_name
        t.boolean :is_active, null: false, default: true
        t.string :klass_prefix, null: false, default: 'E'
        t.boolean :is_generic, null: false, default: true
        t.integer :place, null: false, default: 100
        t.jsonb :properties_template
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
    end
    unless table_exists? :elements
      create_table :elements do |t|
        t.string :name
        t.integer :element_klass_id
        t.string :short_label, null: true
        t.jsonb :properties
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
    end
    unless table_exists? :collections_elements
      create_table :collections_elements do |t|
        t.integer :collection_id
        t.integer :element_id
        t.string :element_type
        t.index :collection_id
        t.index :element_id
        t.datetime :deleted_at
      end
      add_index :collections_elements, %i[element_id collection_id], unique: true
      add_index :collections_elements, :deleted_at
    end

    add_column :element_klasses, :is_active, :boolean, null: false, default: true unless column_exists? :element_klasses, :is_active
    add_column :element_klasses, :klass_prefix, :string, null: false, default: 'E' unless column_exists? :element_klasses, :klass_prefix
    add_column :element_klasses, :is_generic, :boolean, null: false, default: true unless column_exists? :element_klasses, :is_generic
    add_column :element_klasses, :place, :integer, null: false, default: 100 unless column_exists? :element_klasses, :place
    add_column :elements, :short_label, :string unless column_exists? :elements, :short_label
    add_column :collections, :element_detail_level, :integer, default: 10 unless column_exists? :collections, :element_detail_level
    add_column :sync_collections_users, :element_detail_level, :integer, default: 10 unless column_exists? :sync_collections_users, :element_detail_level

  end

  def self.down
    drop_table :element_klasses if table_exists? :element_klasses
    drop_table :elements if table_exists? :elements
    drop_table :collections_elements if table_exists? :collections_elements
    remove_column :collections, :element_detail_level if column_exists? :collections, :element_detail_level
    remove_column :sync_collections_users, :element_detail_level if column_exists? :sync_collections_users, :element_detail_level
  end
end
