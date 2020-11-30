class AddMolfileToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :molfile, :binary
  end
end
