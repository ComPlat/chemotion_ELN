class AddDeviceInfoToAuthenticationKey < ActiveRecord::Migration
  def change
    unless column_exists? :authentication_keys, :device_id
      add_column :authentication_keys, :device_id, :integer
    end
    unless column_exists? :authentication_keys, :ip
      add_column :authentication_keys, :ip, :inet
    end
  end
end
