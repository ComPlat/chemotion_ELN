class AddJtiToUsers < ActiveRecord::Migration[6.1]
  def up
    add_column :users, :jti, :string
    add_index :users, :jti
    User.find_each { |u| u.update(jti: SecureRandom.base64) }
  end

  def down
    remove_column :users, :jti
  end
end
