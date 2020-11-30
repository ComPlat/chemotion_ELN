class AddFirstNameAndLastNameToUsers < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :first_name, :string, null: false
    add_column :users, :last_name, :string, null: false
  end
end
