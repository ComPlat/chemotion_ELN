class AddMolarityValueToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :molarity_value, :float, default: 0.0
  end
end
