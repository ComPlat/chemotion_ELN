class AddUniqElementCollectionIndex < ActiveRecord::Migration
  def change
    add_index :collections_elements, [:element_id, :collection_id], unique: true
  end
end
