class AddSequenceBasedMacromoleculeIdToChemicals < ActiveRecord::Migration[6.0]
  def change
    add_column :chemicals, :sequence_based_macromolecule_id, :bigint
    add_foreign_key :chemicals, :sequence_based_macromolecules, column: :sequence_based_macromolecule_id
  end
end
