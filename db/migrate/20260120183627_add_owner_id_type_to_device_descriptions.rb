class AddOwnerIdTypeToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    add_column :device_descriptions, :owner_id_type, :string
  end
end
