# frozen_string_literal: true

# Create generic segments
class GenericSegments < ActiveRecord::Migration
  def self.up
    unless table_exists? :segment_klasses
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
    end
    unless table_exists? :segments
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
    Matrice.create(name: 'segment', enabled: false, label: 'segment', include_ids: [], exclude_ids: []) if Matrice.find_by(name: 'segment').nil?
  end

  def self.down
    drop_table :segment_klasses if table_exists? :segment_klasses
    drop_table :segments if table_exists? :segments
    Matrice.find_by(name: 'segment')&.really_destroy!
  end
end
