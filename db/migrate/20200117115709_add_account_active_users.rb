class AddAccountActiveUsers < ActiveRecord::Migration[4.2]
  class User < ActiveRecord::Base
    self.inheritance_column = nil
  end

  def up
    add_column(:users, :account_active, :boolean) unless column_exists? :users, :account_active
    User.where(type: ['Person', 'Admin']).find_each do |person|
      person.update_columns(account_active: true)
    end
  end

  def down
    remove_column(:users, :account_active) if column_exists? :users, :account_active
  end
end
