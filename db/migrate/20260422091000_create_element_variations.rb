# frozen_string_literal: true

class CreateElementVariations < ActiveRecord::Migration[6.1]
  def self.up
    return if table_exists?(:element_variations)

    create_table :element_variations do |t|
      t.bigint :element_id, null: false
      t.jsonb :variations, null: false, default: {}
      t.timestamps
    end

    add_index :element_variations, :element_id, unique: true
    add_index :element_variations, :variations, using: :gin
  end

  def self.down
    return unless table_exists?(:element_variations)

    drop_table :element_variations
  end
end
