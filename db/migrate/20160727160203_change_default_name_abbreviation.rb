class ChangeDefaultNameAbbreviation < ActiveRecord::Migration
  def change
    change_column :users, :name_abbreviation, :string, limit: 5
  end
end
