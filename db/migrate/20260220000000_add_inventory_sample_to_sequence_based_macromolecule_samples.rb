# frozen_string_literal: true

class AddInventorySampleToSequenceBasedMacromoleculeSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :sequence_based_macromolecule_samples, :inventory_sample, :boolean, default: false, null: false
    add_index :sequence_based_macromolecule_samples, :inventory_sample, name: 'idx_sbmm_samples_inventory_sample'
  end
end
