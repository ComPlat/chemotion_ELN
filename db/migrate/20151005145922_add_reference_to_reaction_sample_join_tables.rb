class AddReferenceToReactionSampleJoinTables < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions_starting_material_samples, :reference, :boolean, null: true
    add_column :reactions_reactant_samples, :reference, :boolean, null: true
    add_column :reactions_product_samples, :reference, :boolean, null: true
  end
end
