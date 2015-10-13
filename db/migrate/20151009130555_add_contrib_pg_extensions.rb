class AddContribPgExtensions < ActiveRecord::Migration
  def change
    execute 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
  end
end
