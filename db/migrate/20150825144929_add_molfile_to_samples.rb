class AddMolfileToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :molfile, :binary
  end
end
