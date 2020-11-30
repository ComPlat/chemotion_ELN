class AddNameAbbreviationToUsers < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :name_abbreviation, :string, :limit => 3
  end
end
