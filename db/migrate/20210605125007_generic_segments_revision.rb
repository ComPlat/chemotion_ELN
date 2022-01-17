# frozen_string_literal: true

# Create generic segments revision
class GenericSegmentsRevision < ActiveRecord::Migration[4.2]
  class SegmentKlass < ActiveRecord::Base
  end
  def self.up
    add_column :segment_klasses, :uuid, :string, null: true unless column_exists? :segment_klasses, :uuid
    add_column :segment_klasses, :properties_release, :jsonb, default: {} unless column_exists? :segment_klasses, :properties_release
    add_column :segment_klasses, :released_at, :datetime unless column_exists? :segment_klasses, :released_at

    unless table_exists? :segment_klasses_revisions
      create_table :segment_klasses_revisions do |t|
        t.integer :segment_klass_id
        t.string :uuid
        t.jsonb :properties_release, default: {}
        t.datetime :released_at
        t.integer :released_by
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
      add_index :segment_klasses_revisions, :segment_klass_id
    end

    unless table_exists? :segments_revisions
      create_table :segments_revisions do |t|
        t.integer :segment_id
        t.string :uuid
        t.string :klass_uuid
        t.jsonb :properties, default: {}
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
      add_index :segments_revisions, :segment_id
    end
    add_column :segments, :uuid, :string, null: true unless column_exists? :segments, :uuid
    add_column :segments, :klass_uuid, :string, null: true unless column_exists? :segments, :klass_uuid
  end

  def self.down
    drop_table :segment_klasses_revisions if table_exists? :segment_klasses_revisions
    remove_column :segment_klasses, :uuid if column_exists? :segment_klasses, :uuid
    remove_column :segment_klasses, :properties_release if column_exists? :segment_klasses, :properties_release
    remove_column :segment_klasses, :released_at if column_exists? :segment_klasses, :released_at
    drop_table :segments_revisions if table_exists? :segments_revisions
    remove_column :segments, :uuid if column_exists? :segments, :uuid
    remove_column :segments, :klass_uuid if column_exists? :segments, :klass_uuid
  end
end
