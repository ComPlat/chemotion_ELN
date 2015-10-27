class SetSampleDefaults < ActiveRecord::Migration
  def up
    change_column :samples, :purity, :float, default: 1
    change_column :samples, :amount_value, :float, default: 0
    change_column :samples, :amount_unit, :string, default: "mg"
  end

  def down
    change_column :samples, :purity, :float
    change_column :samples, :amount_value, :float
    change_column :samples, :amount_unit, :string
  end
end
