class AddDeviceDescriptionDetailLevelToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections,            :devicedescription_detail_level, :integer, default: 10
    add_column :sync_collections_users, :devicedescription_detail_level, :integer, default: 10
  end
end
