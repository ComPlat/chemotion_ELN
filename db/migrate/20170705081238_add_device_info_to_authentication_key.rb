class AddDeviceInfoToAuthenticationKey < ActiveRecord::Migration
  def change
    add_column :authentication_keys, :device_id, :integer
    add_column :authentication_keys, :ip, :inet
  end
end
