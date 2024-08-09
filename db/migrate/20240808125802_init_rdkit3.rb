# frozen_string_literal: true

class InitRdkit3 < ActiveRecord::Migration[6.1]
  def change
    create_function :set_samples_mol_rdkit
    create_trigger :set_samples_mol_rdkit_trg, on: :samples
  end
end
