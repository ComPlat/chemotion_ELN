class AddTimeStampsToAuthenticationKeys < ActiveRecord::Migration[4.2]
  def change
    add_column :authentication_keys, :created_at, :datetime
    add_column :authentication_keys, :updated_at, :datetime
    add_index :authentication_keys, :user_id
  end
end
