class AddNumSetBitsToMolecule < ActiveRecord::Migration
  def change
    Molecule.reset_column_information
    add_column :molecules, :num_set_bits, :integer, :limit => 1
  end
end
