class ChangeOwlColumnName < ActiveRecord::Migration
  def change
    rename_column :ols_terms, :ols_name, :owl_name
  end
end
