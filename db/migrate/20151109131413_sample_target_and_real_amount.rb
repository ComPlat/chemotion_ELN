class SampleTargetAndRealAmount < ActiveRecord::Migration[4.2]
  def change
    rename_column :samples, :amount_value, :target_amount_value
    rename_column :samples, :amount_unit, :target_amount_unit

    add_column :samples, :real_amount_value, :float
    add_column :samples, :real_amount_unit, :string
  end
end
