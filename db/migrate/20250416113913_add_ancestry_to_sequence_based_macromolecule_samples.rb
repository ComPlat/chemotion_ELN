class AddAncestryToSequenceBasedMacromoleculeSamples < ActiveRecord::Migration[6.1]
  def change
    index_prefix = 'idx_sbmm_samples'
    add_column :sequence_based_macromolecule_samples, :ancestry, :string
    add_index :sequence_based_macromolecule_samples, :ancestry, name: "#{index_prefix}_ancestry"
  end
end
