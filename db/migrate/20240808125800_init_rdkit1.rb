# frozen_string_literal: true

class InitRdkit1 < ActiveRecord::Migration[6.1]
  def up
    create_schema 'rdk'
  end

  def down
    drop_schema 'rdk' if schema_exists? 'rdk'
  end
end
