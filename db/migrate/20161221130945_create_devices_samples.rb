class CreateDevicesSamples < ActiveRecord::Migration
  def change
    create_table :devices_samples do |t|
      t.integer :device_id, null: false
      t.integer :sample_id, null: false
      t.index :device_id
      t.index :sample_id
    end
  end
end
