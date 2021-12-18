class AddInchiToChemscannerMolecule < ActiveRecord::Migration[5.2]
  def change
    add_column :chemscanner_molecules, :inchistring, :string
    add_column :chemscanner_molecules, :inchikey, :string
  end
end
