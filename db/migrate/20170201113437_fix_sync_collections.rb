class FixSyncCollections < ActiveRecord::Migration
  def change
    Collection.find_each do |collection|
      unless collection.sync_collections_users.count > 0
        collection.update_attribute(:is_synchronized, false)
      end
    end
  end
end
