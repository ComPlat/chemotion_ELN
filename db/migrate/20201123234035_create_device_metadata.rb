class CreateDeviceMetadata < ActiveRecord::Migration[4.2]
  def up
    create_table :device_metadata do |t|
      t.integer :device_id

      t.string :doi
      t.string :url
      t.string :landing_page
      t.string :name
      t.string :type
      t.string :description
      t.string :publisher
      t.integer :publication_year

      t.jsonb :manufacturers
      t.jsonb :owners
      t.jsonb :dates

      t.timestamps null: false
      t.datetime :deleted_at, index: true
    end

    add_index :device_metadata, :device_id
  end

  def down
    drop_table :device_metadata
  end
end
