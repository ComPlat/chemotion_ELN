class AddMoleculeIdToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :molecule_id, :integer
    add_index :samples, :molecule_id, name: "index_samples_on_sample_id"
  end
end
