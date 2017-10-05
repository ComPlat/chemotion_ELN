class AddMolarityUnitToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :molarity_unit, :string, default: "M"
  end
end
