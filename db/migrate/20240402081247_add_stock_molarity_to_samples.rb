class AddStockMolarityToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :stock_molarity_value, :float, default: 0.0
    add_column :samples, :stock_molarity_unit, :string, default: 'M'
  end
end
