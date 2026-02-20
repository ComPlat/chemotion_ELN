# frozen_string_literal: true

class AddIndexInventorySampleToSequenceBasedMacromoleculeSamples < ActiveRecord::Migration[6.1]
  def change
    add_index :sequence_based_macromolecule_samples, :inventory_sample, name: 'idx_sbmm_samples_inventory_sample'
  end
end
