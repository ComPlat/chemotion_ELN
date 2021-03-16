# frozen_string_literal: true

# Create generic elements
class GenericElements < ActiveRecord::Migration
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

    add_column :collections, :element_detail_level, :integer, default: 10 unless column_exists? :collections, :element_detail_level
    add_column :sync_collections_users, :element_detail_level, :integer, default: 10 unless column_exists? :sync_collections_users, :element_detail_level

    Matrice.create(name: 'genericElement', enabled: false, label: 'genericElement', include_ids: [], exclude_ids: []) if Matrice.find_by(name: 'genericElement').nil?

    API::ELEMENTS.reverse.each_with_index do |element, idx|
      klass = ElementKlass.find_or_create_by(name: element)
      attributes = { label: element.titleize, desc: "ELN #{element.titleize}", icon_name: "icon-#{element}", klass_prefix: '', properties_template: {}, is_generic: false, place: idx }
      klass&.update(attributes)
    end
  end

  def self.down
    drop_table :element_klasses if table_exists? :element_klasses
    drop_table :elements if table_exists? :elements
    drop_table :collections_elements if table_exists? :collections_elements

    remove_column :collections, :element_detail_level if column_exists? :collections, :element_detail_level
    remove_column :sync_collections_users, :element_detail_level if column_exists? :sync_collections_users, :element_detail_level
    Matrice.find_by(name: 'genericElement')&.really_destroy!
  end
end
