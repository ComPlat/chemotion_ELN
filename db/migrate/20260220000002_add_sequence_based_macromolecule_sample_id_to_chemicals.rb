# frozen_string_literal: true

class AddSequenceBasedMacromoleculeSampleIdToChemicals < ActiveRecord::Migration[6.1]
  def change
    add_column :chemicals, :sequence_based_macromolecule_sample_id, :bigint
    add_index :chemicals, :sequence_based_macromolecule_sample_id, name: 'idx_chemicals_sbmm_sample_id'
    add_foreign_key :chemicals, :sequence_based_macromolecule_samples, column: :sequence_based_macromolecule_sample_id
  end
end
