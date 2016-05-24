class AddShortcutToUsers < ActiveRecord::Migration
  def change
    add_column :users, :shortcut, :string, :limit => 3
  end
end
