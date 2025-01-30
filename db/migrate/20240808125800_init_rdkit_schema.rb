# frozen_string_literal: true

class InitRdkitSchema < ActiveRecord::Migration[6.1]
  def up
    if Chemotion::Application.config.pg_cartridge == 'rdkit'
      create_schema 'rdkit'
    end
  end

  def down
    drop_schema 'rdkit' if schema_exists? 'rdkit'
  end
end
