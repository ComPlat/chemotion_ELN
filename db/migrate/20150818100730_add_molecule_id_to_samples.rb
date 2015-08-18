class AddMoleculeIdToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :molecule_id, :integer
  end
end
