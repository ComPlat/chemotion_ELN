class AddContribPgExtensions < ActiveRecord::Migration
  def change
    execute 'CREATE EXTENSION pg_trgm;'
  end
end
