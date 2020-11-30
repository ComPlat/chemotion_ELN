class ChangeDefaultNameAbbreviation < ActiveRecord::Migration[4.2]
  def change
    change_column :users, :name_abbreviation, :string, limit: 5
  end
end
