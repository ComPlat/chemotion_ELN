# frozen_string_literal: true

class InitRdkitSchema < ActiveRecord::Migration[6.1]
  def up
    return unless Chemotion::Application.config.pg_cartridge == 'rdkit'

    enable_extension 'rdkit' unless extension_enabled?('rdkit')
    create_schema 'rdkit' unless schema_exists? 'rdkit'
  end

  def down
    drop_schema 'rdkit' if schema_exists? 'rdkit'
    execute 'DROP EXTENSION IF EXISTS rdkit CASCADE' if extension_enabled?('rdkit')
  end
end
