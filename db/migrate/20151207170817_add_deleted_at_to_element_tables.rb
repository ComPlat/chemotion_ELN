class AddDeletedAtToElementTables < ActiveRecord::Migration[4.2]
  def change
    add_column :collections, :deleted_at, :datetime
    add_index :collections, :deleted_at
    add_column :collections_reactions, :deleted_at, :datetime
    add_index :collections_reactions, :deleted_at
    add_column :collections_samples, :deleted_at, :datetime
    add_index :collections_samples, :deleted_at
    add_column :collections_screens, :deleted_at, :datetime
    add_index :collections_screens, :deleted_at
    add_column :collections_wellplates, :deleted_at, :datetime
    add_index :collections_wellplates, :deleted_at
    add_column :screens_wellplates, :deleted_at, :datetime
    add_index :screens_wellplates, :deleted_at
    add_column :reactions_product_samples, :deleted_at, :datetime
    add_index :reactions_product_samples, :deleted_at
    add_column :reactions_reactant_samples, :deleted_at, :datetime
    add_index :reactions_reactant_samples, :deleted_at
    add_column :reactions_starting_material_samples, :deleted_at, :datetime
    add_index :reactions_starting_material_samples, :deleted_at
    add_column :literatures, :deleted_at, :datetime
    add_index :literatures, :deleted_at
    add_column :samples, :deleted_at, :datetime
    add_index :samples, :deleted_at
    add_column :molecules, :deleted_at, :datetime
    add_index :molecules, :deleted_at
    add_column :reactions, :deleted_at, :datetime
    add_index :reactions, :deleted_at
    add_column :wellplates, :deleted_at, :datetime
    add_index :wellplates, :deleted_at
    add_column :screens, :deleted_at, :datetime
    add_index :screens, :deleted_at
    add_column :wells, :deleted_at, :datetime
    add_index :wells, :deleted_at
    add_column :users, :deleted_at, :datetime
    add_index :users, :deleted_at
  end
end
