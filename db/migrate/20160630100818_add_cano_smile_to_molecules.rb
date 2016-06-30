class AddCanoSmileToMolecules < ActiveRecord::Migration
  def change
    add_column :molecules, :cano_smiles, :string
  end
end
