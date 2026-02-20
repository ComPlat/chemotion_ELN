class AddSequenceBasedMacromoleculeSampleIdToChemicals < ActiveRecord::Migration[6.0]
  def change
    add_column :chemicals, :sequence_based_macromolecule_sample_id, :bigint
    add_foreign_key :chemicals, :sequence_based_macromolecule_samples, column: :sequence_based_macromolecule_sample_id
  end
end
