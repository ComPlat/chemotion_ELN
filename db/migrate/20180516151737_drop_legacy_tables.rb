class DropLegacyTables < ActiveRecord::Migration[4.2]
  def change
    [
      :reactions_starting_material_samples, :reactions_reactant_samples,
      :reactions_solvent_samples, :reactions_product_samples
    ].each{ |table| drop_table table}
  end
end
