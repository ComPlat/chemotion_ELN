# frozen_string_literal: true

class RemoveOldCollectionTablesStructure < ActiveRecord::Migration[6.1]
  # The nine per-element detail-level columns dropped from `collections` (all default 10).
  DETAIL_LEVEL_COLUMNS = %i[
    celllinesample_detail_level
    devicedescription_detail_level
    element_detail_level
    reaction_detail_level
    researchplan_detail_level
    sample_detail_level
    screen_detail_level
    sequencebasedmacromoleculesample_detail_level
    wellplate_detail_level
  ].freeze

  def up
    drop_table :sync_collections_users
    execute 'drop view v_samples_collections;'
    remove_columns(
      :collections,
      :celllinesample_detail_level,
      :devicedescription_detail_level,
      :element_detail_level,
      :reaction_detail_level,
      :researchplan_detail_level,
      :sample_detail_level,
      :screen_detail_level,
      :sequencebasedmacromoleculesample_detail_level,
      :wellplate_detail_level,
      type: :integer,
      default: 10,
      if_exists: true
    )
    remove_columns(
      :collections,
      :is_shared,
      :is_synchronized,
      type: :boolean,
      default: false,
      if_exists: true
    )
    remove_column(:collections, :permission_level, type: :integer, default: 0)
    remove_column(:collections, :shared_by_id, type: :integer)
  end

  # Best-effort SCHEMA restoration only: re-adds the dropped `collections` columns, the
  # `sync_collections_users` table, and the `v_samples_collections` view. This exists so the
  # collection-share data migration stays testable (the spec restores the pre-refactor schema it
  # reads) and instances retain a schema rollback path.
  #
  # It does NOT restore data: {MigrateToCollectionShare} already consumed the sync rows and the
  # per-collection sharing columns. A real rollback must restore from a backup.
  def down
    restore_collection_sharing_columns
    restore_sync_collections_users_table
    restore_v_samples_collections_view
  end

  private

  def restore_collection_sharing_columns
    add_column :collections, :shared_by_id, :integer, if_not_exists: true
    add_column :collections, :permission_level, :integer, default: 0, if_not_exists: true
    add_column :collections, :is_shared, :boolean, default: false, null: false, if_not_exists: true
    add_column :collections, :is_synchronized, :boolean, default: false, null: false, if_not_exists: true
    DETAIL_LEVEL_COLUMNS.each do |column|
      add_column :collections, column, :integer, default: 10, if_not_exists: true
    end
  end

  def restore_sync_collections_users_table
    create_table :sync_collections_users, if_not_exists: true do |t|
      t.integer :user_id
      t.integer :collection_id
      t.integer :shared_by_id
      t.integer :permission_level, default: 0
      t.integer :sample_detail_level, default: 0
      t.integer :reaction_detail_level, default: 0
      t.integer :wellplate_detail_level, default: 0
      t.integer :screen_detail_level, default: 0
      t.string  :fake_ancestry
      t.integer :researchplan_detail_level, default: 10
      t.string  :label
      t.datetime :created_at
      t.datetime :updated_at
      t.integer :element_detail_level, default: 10
      t.integer :celllinesample_detail_level, default: 10
      t.integer :devicedescription_detail_level, default: 10
      t.integer :sequencebasedmacromoleculesample_detail_level, default: 10
    end
    add_index :sync_collections_users, :collection_id, if_not_exists: true
    add_index :sync_collections_users, %i[shared_by_id user_id fake_ancestry],
              name: 'index_sync_collections_users_on_shared_by_id', if_not_exists: true
    add_index :sync_collections_users, %i[user_id fake_ancestry],
              name: 'index_sync_collections_users_on_user_id_and_fake_ancestry', if_not_exists: true
  end

  def restore_v_samples_collections_view
    execute 'DROP VIEW IF EXISTS v_samples_collections;'
    execute(<<~SQL.squish)
      CREATE VIEW v_samples_collections AS
      SELECT cols.id AS cols_id, cols.user_id AS cols_user_id,
             cols.sample_detail_level AS cols_sample_detail_level,
             cols.wellplate_detail_level AS cols_wellplate_detail_level,
             cols.shared_by_id AS cols_shared_by_id, cols.is_shared AS cols_is_shared,
             samples.id AS sams_id, samples.name AS sams_name
      FROM collections cols
      JOIN collections_samples col_samples
        ON col_samples.collection_id = cols.id AND col_samples.deleted_at IS NULL
      JOIN samples ON samples.id = col_samples.sample_id AND samples.deleted_at IS NULL
      WHERE cols.deleted_at IS NULL;
    SQL
  end
end
