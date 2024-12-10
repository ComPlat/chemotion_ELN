# frozen_string_literal: true

class LayerStandardHistories < ActiveRecord::Migration[6.1]
  def self.up
    unless table_exists? :layer_tracks
      create_table :layer_tracks do |t|
        t.string :identifier, null: false
        t.string :name
        t.string :label
        t.string :description
        t.jsonb :properties, default: { }
        t.integer :created_by
        t.datetime :created_at
        t.integer :updated_by
        t.datetime :updated_at
        t.integer :deleted_by
        t.datetime :deleted_at
      end
      add_foreign_key :layer_tracks, :layers, column: :identifier, primary_key: :identifier
    end
  end

  def self.down
    if foreign_key_exists?(:layer_tracks, :layers, column: :identifier)
      remove_foreign_key :layer_tracks, :layers, column: :identifier
    end
    drop_table :layer_tracks if table_exists? :layer_tracks
  end
end
