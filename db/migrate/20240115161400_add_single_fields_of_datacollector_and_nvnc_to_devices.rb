class AddSingleFieldsOfDatacollectorAndNvncToDevices < ActiveRecord::Migration[6.1]
  def change
    add_column :devices, :datacollector_method, :string
    add_column :devices, :datacollector_dir, :string
    add_column :devices, :datacollector_host, :string
    add_column :devices, :datacollector_user, :string
    add_column :devices, :datacollector_authentication, :string
    add_column :devices, :datacollector_number_of_files, :string
    add_column :devices, :datacollector_key_name, :string
    add_column :devices, :datacollector_user_level_selected, :boolean, default: false
    add_column :devices, :novnc_token, :string
    add_column :devices, :novnc_target, :string
    add_column :devices, :novnc_password, :string
    change_column_default :devices, :account_active, from: nil, to: false
  end
end
