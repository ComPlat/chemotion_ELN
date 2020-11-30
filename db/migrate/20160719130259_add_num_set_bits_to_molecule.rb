class AddNumSetBitsToMolecule < ActiveRecord::Migration[4.2]
  def change
    Molecule.reset_column_information
    add_column :molecules, :num_set_bits, :integer, :limit => 1
  end
end
