# frozen_string_literal: true

class AddMoreFieldsToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def up
    rename_column :device_descriptions, :device_type, :device_class
    rename_column :device_descriptions, :device_type_detail, :device_class_detail

    add_column :device_descriptions, :owner_institution, :string
    add_column :device_descriptions, :owner_email, :string
    add_column :device_descriptions, :owner_id, :string
    add_column :device_descriptions, :inventory_id, :string
    add_column :device_descriptions, :alternative_identifier, :string
    add_column :device_descriptions, :device_type, :string
    add_column :device_descriptions, :vendor_id_type, :string
  end

  def down
    remove_column :device_descriptions, :owner_institution
    remove_column :device_descriptions, :owner_email
    remove_column :device_descriptions, :owner_id
    remove_column :device_descriptions, :inventory_id
    remove_column :device_descriptions, :alternative_identifier
    remove_column :device_descriptions, :device_type
    remove_column :device_descriptions, :vendor_id_type

    rename_column :device_descriptions, :device_class, :device_type
    rename_column :device_descriptions, :device_class_detail, :device_type_detail
  end
end
