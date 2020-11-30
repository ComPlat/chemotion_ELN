class InsertAdministratorAccount < ActiveRecord::Migration[4.2]
  class User < ActiveRecord::Base
    self.inheritance_column = nil
    devise :database_authenticatable
  end

  def change
    attributes = {
      email: 'eln-admin@kit.edu',
      first_name: 'ELN',
      last_name: 'Admin',
      password: 'PleaseChangeYourPassword',
      name_abbreviation: 'ADM',
      type: 'Admin'
    }
    user = User.create!(attributes)
    user.update!(account_active: true) if column_exists?(:users, :account_active)
    user.update!(confirmed_at: DateTime.now) if column_exists?(:users, :account_active)
  end
end
