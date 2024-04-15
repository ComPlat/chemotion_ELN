class AddWeightToVesselTemplates < ActiveRecord::Migration[6.1]
  def change
    add_column :vessel_templates, :weight_amount, :float
    add_column :vessel_templates, :weight_unit, :string
  end
end
