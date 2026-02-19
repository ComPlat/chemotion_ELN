# frozen_string_literal: true

class AddReferenceToReactionsReactantSbmmSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions_reactant_sbmm_samples, :reference, :boolean, default: false, null: false
  end
end
