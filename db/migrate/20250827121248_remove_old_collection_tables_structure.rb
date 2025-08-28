class RemoveOldCollectionTablesStructure < ActiveRecord::Migration[6.1]
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
      :is_locked,
      :is_shared,
      :is_synchronized,
      type: :boolean,
      default: false,
      if_exists: true
    )
    remove_column(:collections, :permission_level, type: :integer, default: 0)
    remove_column(:collections, :shared_by_id, type: :integer)
  end
end
