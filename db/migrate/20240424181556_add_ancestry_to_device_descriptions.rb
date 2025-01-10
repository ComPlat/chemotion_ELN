class AddAncestryToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    add_column :device_descriptions, :ancestry, :string
    add_index :device_descriptions, :ancestry
  end
end
