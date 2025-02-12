class CreateCollectionsSequenceBasedMacromoleculeSample < ActiveRecord::Migration[6.1]
  def change
    create_table :collections_sequence_based_macromolecule_samples do |t|
      t.belongs_to :collection, foreign_key: true, index: { name: 'index_collection_sbmm_samples_collection' }
      t.belongs_to :sequence_based_macromolecule_sample, foreign_key: true, index: { name: 'index_collection_sbmm_samples_sample' }
      t.datetime :deleted_at, null: true, index: true
      t.timestamps
    end
    add_index :collections_sequence_based_macromolecule_samples, [:collection_id, :sequence_based_macromolecule_sample_id], unique: true, name: 'index_collection_sbmm_samples_unique_joins'
  end
end
