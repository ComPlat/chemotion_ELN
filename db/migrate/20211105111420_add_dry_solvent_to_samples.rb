class AddDrySolventToSamples < ActiveRecord::Migration[5.2]
  def change
    add_column :samples, :dry_solvent, :boolean, default: false
  end
end
