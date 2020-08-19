class ChangeLimitNameAbbreviationToUser < ActiveRecord::Migration
  
  def up
    change_column :users, :name_abbreviation, :string, :limit => 12
  end

  def down
    change_column :users, :name_abbreviation, :string, :limit => 5
  end

end
