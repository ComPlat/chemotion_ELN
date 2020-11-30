class ChangeOwlColumnName < ActiveRecord::Migration[4.2]
  def change
    rename_column :ols_terms, :ols_name, :owl_name
  end
end
