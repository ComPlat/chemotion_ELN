# frozen_string_literal: true

# Create tables: segment_klasses, segments
class CreateSegments < ActiveRecord::Migration
  def change
    create_table :segment_klasses do |t|
      t.integer :element_klass_id
      t.string :label, null: false
      t.string :desc
      t.jsonb :properties_template
      t.boolean :is_active, null: false, default: true
      t.integer :place, null: false, default: 100
      t.integer :created_by
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end

    create_table :segments do |t|
      t.integer :segment_klass_id
      t.string :element_type
      t.integer :element_id
      t.jsonb :properties
      t.integer :created_by
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end
  end
end
