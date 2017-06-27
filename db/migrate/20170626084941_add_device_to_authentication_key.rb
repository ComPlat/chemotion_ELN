class AddDeviceToAuthenticationKey < ActiveRecord::Migration
  def change
    add_column :authentication_keys, :device_id, :integer
  end
end
