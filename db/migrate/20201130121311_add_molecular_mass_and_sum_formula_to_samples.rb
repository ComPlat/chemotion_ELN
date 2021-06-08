class AddMolecularMassAndSumFormulaToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :molecular_mass, :float
    add_column :samples, :sum_formula, :string
  end
end
