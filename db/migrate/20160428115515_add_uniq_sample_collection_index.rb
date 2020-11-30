class AddUniqSampleCollectionIndex < ActiveRecord::Migration[4.2]
  def change
    add_index :collections_samples, [:sample_id, :collection_id], unique: true
  end
end
