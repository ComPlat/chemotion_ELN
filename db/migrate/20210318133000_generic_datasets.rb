# frozen_string_literal: true

# Create generic segments
class GenericDatasets < ActiveRecord::Migration[4.2]
  def self.up
    unless table_exists? :dataset_klasses
      create_table :dataset_klasses do |t|
        t.string :ols_term_id, null: false
        t.string :label, null: false
        t.string :desc
        t.jsonb :properties_template, null: false, default: { 'layers': {}, 'select_options': {} }
        t.boolean :is_active, null: false, default: false
        t.integer :place, null: false, default: 100
        t.integer :created_by, null: false
        t.datetime :created_at, null: false
        t.datetime :updated_at
        t.datetime :deleted_at
      end
    end
    unless table_exists? :datasets
      create_table :datasets do |t|
        t.integer :dataset_klass_id
        t.string :element_type
        t.integer :element_id
        t.jsonb :properties
        t.datetime :created_at, null: false
        t.datetime :updated_at
      end
    end
    Matrice.create(name: 'genericDataset', enabled: false, label: 'genericDataset', include_ids: [], exclude_ids: []) if Matrice.find_by(name: 'genericDataset').nil?
    Labimotion::DatasetKlass.init_seeds
  end

  def self.down
    drop_table :dataset_klasses if table_exists? :dataset_klasses
    drop_table :datasets if table_exists? :datasets
    Matrice.find_by(name: 'genericDataset')&.really_destroy!
  end
end
