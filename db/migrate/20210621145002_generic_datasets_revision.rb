# frozen_string_literal: true

# Create generic dataset revision
class GenericDatasetsRevision < ActiveRecord::Migration[4.2]
  class DatasetKlass < ActiveRecord::Base
  end
  def self.up
    add_column :dataset_klasses, :uuid, :string, null: true unless column_exists? :dataset_klasses, :uuid
    add_column :dataset_klasses, :properties_release, :jsonb, default: {} unless column_exists? :dataset_klasses, :properties_release
    add_column :dataset_klasses, :released_at, :datetime unless column_exists? :dataset_klasses, :released_at

    unless table_exists? :dataset_klasses_revisions
      create_table :dataset_klasses_revisions do |t|
        t.integer :dataset_klass_id
        t.string :uuid
        t.jsonb :properties_release, default: {}
        t.datetime :released_at
        t.integer :released_by
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
      add_index :dataset_klasses_revisions, :dataset_klass_id
    end

    unless table_exists? :datasets_revisions
      create_table :datasets_revisions do |t|
        t.integer :dataset_id
        t.string :uuid
        t.string :klass_uuid
        t.jsonb :properties, default: {}
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
      add_index :datasets_revisions, :dataset_id
    end
    add_column :datasets, :uuid, :string, null: true unless column_exists? :datasets, :uuid
    add_column :datasets, :klass_uuid, :string, null: true unless column_exists? :datasets, :klass_uuid
    add_column :datasets, :deleted_at, :datetime unless column_exists? :datasets, :deleted_at
  end

  def self.down
    drop_table :dataset_klasses_revisions if table_exists? :dataset_klasses_revisions
    remove_column :dataset_klasses, :uuid if column_exists? :dataset_klasses, :uuid
    remove_column :dataset_klasses, :properties_release if column_exists? :dataset_klasses, :properties_release
    remove_column :dataset_klasses, :released_at if column_exists? :dataset_klasses, :released_at
    drop_table :datasets_revisions if table_exists? :datasets_revisions
    remove_column :datasets, :uuid if column_exists? :datasets, :uuid
    remove_column :datasets, :klass_uuid if column_exists? :datasets, :klass_uuid
  end
end
