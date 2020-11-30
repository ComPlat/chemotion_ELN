class AddContribPgExtensions < ActiveRecord::Migration[4.2]
  def change
    execute 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
  end
end
