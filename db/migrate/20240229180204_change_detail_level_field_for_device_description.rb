class ChangeDetailLevelFieldForDeviceDescription < ActiveRecord::Migration[6.1]
  def change
    rename_column :collections, :device_description_detail_level, :devicedescription_detail_level
    add_column :sync_collections_users, :devicedescription_detail_level, :integer, default: 10
  end
end
