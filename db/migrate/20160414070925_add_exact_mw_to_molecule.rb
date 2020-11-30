class AddExactMwToMolecule < ActiveRecord::Migration[4.2]
  def change
    add_column :molecules, :exact_molecular_weight, :float
  end
end
