class AddUniqSampleCollectionIndex < ActiveRecord::Migration
  def change
    add_index :collections_samples, [:sample_id, :collection_id], unique: true
  end
end
