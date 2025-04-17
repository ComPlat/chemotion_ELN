class AddNewIndexToMolecules < ActiveRecord::Migration[6.1]
  def change
    remove_index :molecules, [:inchikey, :is_partial] if index_exists?(:molecules, [:inchikey, :is_partial])
    remove_index :molecules, [:inchikey, :is_partial, :sum_formular] if index_exists?(:molecules, [:inchikey, :is_partial, :sum_formular])
    add_index :molecules, [:inchikey, :sum_formular, :is_partial], unique: true, name: 'index_molecules_on_formula_and_inchikey_and_is_partial'
  end
end
