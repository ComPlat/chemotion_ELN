class CreateCollectionsSequenceBasedMacromoleculeSample < ActiveRecord::Migration[6.1]
  def change
    index_prefix = "idx_collections_sbmm_sample"
    create_table :collections_sequence_based_macromolecule_samples do |t|
      t.belongs_to :collection, foreign_key: true, index: { name: "#{index_prefix}_collection" }
      t.belongs_to :sequence_based_macromolecule_sample, foreign_key: true, index: { name: "#{index_prefix}_sample" }
      t.datetime :deleted_at, null: true, index: { name: "#{index_prefix}_deleted_at" }
      t.timestamps
    end
    add_index(
      :collections_sequence_based_macromolecule_samples,
      [:collection_id, :sequence_based_macromolecule_sample_id],
      unique: true,
      name: "#{index_prefix}_unique_joins"
    )
  end
end
