class AddMolarityUnitToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :molarity_unit, :string, default: "M"
  end
end
