# frozen_string_literal: true

class InitRdkitFunctions < ActiveRecord::Migration[6.1]
  def change
    if Chemotion::Application.config.pg_cartridge == 'RDKit'
      create_function :set_samples_mol_rdkit
      create_trigger :set_samples_mol_rdkit_trg, on: :samples
    end
  end
end
