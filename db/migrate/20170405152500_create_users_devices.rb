class CreateUsersDevices < ActiveRecord::Migration[4.2]
  def change
    create_table :users_devices do |t|
      t.integer :user_id
      t.integer :device_id
    end
  end
end
