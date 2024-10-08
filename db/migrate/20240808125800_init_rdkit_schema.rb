# frozen_string_literal: true

class InitRdkitSchema < ActiveRecord::Migration[6.1]
  def up
    if Chemotion::Application.config.pg_cartridge == 'RDKit'
      create_schema 'rdk'
    end
  end

  def down
    drop_schema 'rdk' if schema_exists? 'rdk'
  end
end
