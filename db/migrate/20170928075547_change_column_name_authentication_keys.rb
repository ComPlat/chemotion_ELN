class ChangeColumnNameAuthenticationKeys < ActiveRecord::Migration[4.2]
  def change
    rename_column :authentication_keys, :device_id, :user_id
    add_column :authentication_keys, :role, :string
  end
end
