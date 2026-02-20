# frozen_string_literal: true

class AddOwnerIdTypeToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def up
    add_column :device_descriptions, :owner_id_type, :string
    add_column :device_descriptions, :device_type_name, :string
    add_column :device_descriptions, :device_type_id, :string
    add_column :device_descriptions, :device_type_id_type, :string
    remove_column  :device_descriptions, :device_type
  end

  def down
    remove_column :device_descriptions, :owner_id_type
    remove_column :device_descriptions, :device_type_name
    remove_column :device_descriptions, :device_type_id
    remove_column :device_descriptions, :device_type_id_type
    add_column  :device_descriptions, :device_type, :string
  end
end
