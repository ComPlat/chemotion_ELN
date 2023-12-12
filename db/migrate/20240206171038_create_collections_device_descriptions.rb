class CreateCollectionsDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    create_table :collections_device_descriptions do |t|
      t.integer :collection_id
      t.integer :device_description_id
      t.datetime :deleted_at
    end
    add_index :collections_device_descriptions, [:device_description_id, :collection_id], unique: true, name: :index_on_device_description_and_collection
    add_index :collections_device_descriptions, :collection_id
    add_index :collections_device_descriptions, :deleted_at
  end
end
