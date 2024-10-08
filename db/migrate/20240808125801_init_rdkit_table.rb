# frozen_string_literal: true

class InitRdkitTable < ActiveRecord::Migration[6.1]
  def up
    if Chemotion::Application.config.pg_cartridge == 'RDKit'
      create_table 'rdk.mols', as:
        "select id, mol_from_ctab(encode(molfile, 'escape')::cstring) m from samples
          where mol_from_ctab(encode(molfile, 'escape')::cstring) is not null;"
      add_index 'rdk.mols', :m, using: 'gist'
    end
  end

  def down
    drop_table 'rdk.mols' if table_exists? 'rdk.mols'
  end
end
