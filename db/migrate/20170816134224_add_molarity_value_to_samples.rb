class AddMolarityValueToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :molarity_value, :float, default: 0.0
  end
end
