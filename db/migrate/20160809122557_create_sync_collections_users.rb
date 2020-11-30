class CreateSyncCollectionsUsers < ActiveRecord::Migration[4.2]
  def change
    create_table :sync_collections_users do |t|
      t.integer :user_id
      t.integer :collection_id

      t.integer :shared_by_id
      t.integer :permission_level,        default: 0
      t.integer :sample_detail_level,     default: 0
      t.integer :reaction_detail_level,   default: 0
      t.integer :wellplate_detail_level,  default: 0
      t.integer :screen_detail_level,     default: 0
      t.string  :fake_ancestry

    end

    add_index :sync_collections_users, [:user_id, :fake_ancestry]
    add_index :sync_collections_users, :collection_id
    add_index :sync_collections_users, [:shared_by_id, :user_id, :fake_ancestry], name: 'index_sync_collections_users_on_shared_by_id'

  end
end
