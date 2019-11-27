class AddElementPermission < ActiveRecord::Migration
  def self.up
    remove_column :collections, :element_detail_level if column_exists? :collections, :element_detail_level
    remove_column :sync_collections_users, :element_detail_level if column_exists? :sync_collections_users, :element_detail_level

    #add_column :collections, :element_detail_level, :jsonb, default: {} unless column_exists? :collections, :element_detail_level
    #add_column :sync_collections_users, :element_detail_level, :jsonb, default: {} unless column_exists? :sync_collections_users, :element_detail_level
    add_column :collections, :element_detail_level, :integer, default: 10
    add_column :sync_collections_users, :element_detail_level, :integer, default: 10

    add_index :collections_elements, :deleted_at

  end

  def self.down
    remove_column :collections, :element_detail_level if column_exists? :collections, :element_detail_level
    remove_column :sync_collections_users, :element_detail_level if column_exists? :sync_collections_users, :element_detail_level
  end

end
