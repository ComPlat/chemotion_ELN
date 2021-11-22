class AddOmniauthToUser < ActiveRecord::Migration[5.2]
  def change
    add_column :users, :omniauth_provider, :string
    add_column :users, :omniauth_uid, :string
  end
end
