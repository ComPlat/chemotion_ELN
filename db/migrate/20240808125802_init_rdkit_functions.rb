# frozen_string_literal: true

class InitRdkitFunctions < ActiveRecord::Migration[6.1]
  def change
    reversible do |direction|
      direction.up do
        if Chemotion::Application.config.pg_cartridge == 'rdkit'
          create_function :set_samples_mol_rdkit
          create_trigger :set_samples_mol_rdkit_trg, on: :samples
        end
      end
      direction.down do
        execute 'DROP TRIGGER IF EXISTS set_samples_mol_rdkit_trg ON samples'
        execute 'DROP FUNCTION IF EXISTS set_samples_mol_rdkit()'
      end
    end
  end
end
