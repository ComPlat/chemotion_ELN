class AddExactMwToMolecule < ActiveRecord::Migration
  def change
    add_column :molecules, :exact_molecular_weight, :float
  end
end
