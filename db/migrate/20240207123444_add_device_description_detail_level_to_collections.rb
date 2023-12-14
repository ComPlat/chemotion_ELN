class AddDeviceDescriptionDetailLevelToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :device_description_detail_level, :integer, default: 10
  end
end
