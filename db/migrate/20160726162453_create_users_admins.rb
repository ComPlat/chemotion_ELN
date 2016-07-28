class CreateUsersAdmins < ActiveRecord::Migration
  def change
    create_table :users_admins do |t|
      t.integer :user_id
      t.integer :admin_id
    end
    add_index :users_admins, :user_id
    add_index :users_admins, :admin_id
  end
end
