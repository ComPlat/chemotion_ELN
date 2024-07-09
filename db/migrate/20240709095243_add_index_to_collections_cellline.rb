class AddIndexToCollectionsCellline < ActiveRecord::Migration[6.1]
  def change
    add_index :collections_celllines, [:cellline_sample_id, :collection_id], unique: true, name: "index_collections_celllines_on_cellsample_id_and_coll_id"
    add_index :collections_celllines, [:collection_id]
    add_index :collections_celllines, [:deleted_at]

    add_index :collections_research_plans, [:collection_id]
  end
end
