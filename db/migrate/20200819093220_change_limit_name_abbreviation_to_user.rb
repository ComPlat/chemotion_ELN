class ChangeLimitNameAbbreviationToUser < ActiveRecord::Migration[4.2]
  
  def up
    change_column :users, :name_abbreviation, :string, :limit => 12
  end

  def down
    change_column :users, :name_abbreviation, :string, :limit => 5
  end

end
