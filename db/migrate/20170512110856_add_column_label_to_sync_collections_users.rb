class AddColumnLabelToSyncCollectionsUsers < ActiveRecord::Migration[4.2]
  def change
    add_column :sync_collections_users, :label, :string
    add_timestamps :sync_collections_users
  end
end
