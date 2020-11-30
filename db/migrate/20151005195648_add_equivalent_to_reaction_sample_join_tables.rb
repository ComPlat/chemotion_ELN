class AddEquivalentToReactionSampleJoinTables < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions_starting_material_samples, :equivalent, :float, null: true
    add_column :reactions_reactant_samples, :equivalent, :float, null: true
    add_column :reactions_product_samples, :equivalent, :float, null: true
  end
end
