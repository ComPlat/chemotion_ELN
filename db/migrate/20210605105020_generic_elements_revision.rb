# frozen_string_literal: true

# Create generic elements revisions
class GenericElementsRevision < ActiveRecord::Migration[4.2]
  class ElementKlass < ActiveRecord::Base
  end
  def self.up
    add_column :element_klasses, :uuid, :string, null: true unless column_exists? :element_klasses, :uuid
    add_column :element_klasses, :properties_release, :jsonb, default: {} unless column_exists? :element_klasses, :properties_release
    add_column :element_klasses, :released_at, :datetime unless column_exists? :element_klasses, :released_at

    unless table_exists? :element_klasses_revisions
      create_table :element_klasses_revisions do |t|
        t.integer :element_klass_id
        t.string :uuid
        t.jsonb :properties_release, default: {}
        t.datetime :released_at
        t.integer :released_by
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
      add_index :element_klasses_revisions, :element_klass_id
    end

    unless table_exists? :elements_revisions
      create_table :elements_revisions do |t|
        t.integer :element_id
        t.string :uuid
        t.string :klass_uuid
        t.string :name
        t.jsonb :properties, default: {}
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
      add_index :elements_revisions, :element_id
    end
    add_column :elements, :uuid, :string, null: true unless column_exists? :elements, :uuid
    add_column :elements, :klass_uuid, :string, null: true unless column_exists? :elements, :klass_uuid
  end

  def self.down
    drop_table :element_klasses_revisions if table_exists? :element_klasses_revisions
    remove_column :element_klasses, :uuid if column_exists? :element_klasses, :uuid
    remove_column :element_klasses, :properties_release if column_exists? :element_klasses, :properties_release
    remove_column :element_klasses, :released_at if column_exists? :element_klasses, :released_at
    drop_table :elements_revisions if table_exists? :elements_revisions
    remove_column :elements, :uuid if column_exists? :elements, :uuid
    remove_column :elements, :klass_uuid if column_exists? :elements, :klass_uuid
  end
end
