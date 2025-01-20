class AddWeightUnitToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    add_column :device_descriptions, :weight_unit, :string 
  end
end
