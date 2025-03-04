# frozen_string_literal: true

class InitRdkitTable < ActiveRecord::Migration[6.1]
  def up
    return unless Chemotion::Application.config.pg_cartridge == 'rdkit'

    create_table 'rdkit.mols', as:
      "select id, mol_from_ctab(encode(molfile, 'escape')::cstring) m from samples
          where mol_from_ctab(encode(molfile, 'escape')::cstring) is not null;"
    add_index 'rdkit.mols', :m, using: 'gist'
  end

  def down
    drop_table 'rdkit.mols' if table_exists? 'rdkit.mols'
  end
end
