class RemoveFingerprintFromMolecule < ActiveRecord::Migration[4.2]
  def change
    Molecule.reset_column_information
    remove_column :molecules, :fp0, "bit(64)"
    remove_column :molecules, :fp1, "bit(64)"
    remove_column :molecules, :fp2, "bit(64)"
    remove_column :molecules, :fp3, "bit(64)"
    remove_column :molecules, :fp4, "bit(64)"
    remove_column :molecules, :fp5, "bit(64)"
    remove_column :molecules, :fp6, "bit(64)"
    remove_column :molecules, :fp7, "bit(64)"
    remove_column :molecules, :fp8, "bit(64)"
    remove_column :molecules, :fp9, "bit(64)"
    remove_column :molecules, :fp10, "bit(64)"
    remove_column :molecules, :fp11, "bit(64)"
    remove_column :molecules, :fp12, "bit(64)"
    remove_column :molecules, :fp13, "bit(64)"
    remove_column :molecules, :fp14, "bit(64)"
    remove_column :molecules, :fp15, "bit(64)"
    remove_column :molecules, :num_set_bits, :integer
  end
end
