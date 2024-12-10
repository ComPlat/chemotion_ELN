# frozen_string_literal: true

class LayerStandards < ActiveRecord::Migration[6.1]
  def self.up
    unless table_exists? :layers
      create_table :layers do |t|
        t.string :name, null: false
        t.string :label
        t.string :description
        t.jsonb :properties, null: false, default: { }
        t.string :identifier, null: false
        t.integer :created_by, null: false
        t.datetime :created_at, null: false
        t.integer :updated_by
        t.datetime :updated_at
        t.integer :deleted_by
        t.datetime :deleted_at
      end
      add_index :layers, :properties, using: :gin
      add_index :layers, :name
      add_index :layers, :label
      add_index :layers, :identifier, unique: true
    end
  end

  def self.down
    remove_index :layers, :properties if index_exists?(:layers, :properties)
    remove_index :layers, :name if index_exists?(:layers, :name)
    remove_index :layers, :label if index_exists?(:layers, :label)
    remove_index :layers, :identifier if index_exists?(:layers, :identifier)
    drop_table :layers if table_exists? :layers
  end
end
