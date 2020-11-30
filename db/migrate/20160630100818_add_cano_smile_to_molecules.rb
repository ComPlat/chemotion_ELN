class AddCanoSmileToMolecules < ActiveRecord::Migration[4.2]
  def change
    add_column :molecules, :cano_smiles, :string

    # Populate smiles
    Molecule.reset_column_information
    Molecule.all.each do |molecule|
      babel_info =
        Chemotion::OpenBabelService.molecule_info_from_molfile(molecule.molfile)

      molecule.cano_smiles = babel_info[:cano_smiles]
      molecule.save!
    end

  end
end
