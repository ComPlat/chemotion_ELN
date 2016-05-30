class AddNameAbbreviationToUsers < ActiveRecord::Migration
  def change
    add_column :users, :name_abbreviation, :string, :limit => 3
  end
end
