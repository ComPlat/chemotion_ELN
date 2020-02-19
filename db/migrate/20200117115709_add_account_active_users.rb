class AddAccountActiveUsers < ActiveRecord::Migration
  class User < ActiveRecord::Base
  end

  def up
    add_column(:users, :account_active, :boolean) unless column_exists? :users, :account_active
    User.where(type: ['Person','Admin']).find_each do |person|
      person.update_columns(account_active: true)
    end
  end

  def down
    remove_column(:users, :account_active) if column_exists? :users, :account_active
  end
end
