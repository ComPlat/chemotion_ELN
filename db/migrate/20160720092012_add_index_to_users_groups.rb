class AddIndexToUsersGroups < ActiveRecord::Migration
  def change
    add_index :users_groups, :user_id
    add_index :users_groups, :group_id

  end
end
