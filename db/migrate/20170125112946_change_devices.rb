class ChangeDevices < ActiveRecord::Migration[4.2]
  def change
    add_column :devices, :title, :string, default: ""
    add_column :devices, :user_id, :integer
    add_column :users, :selected_device_id, :integer
  end
end
