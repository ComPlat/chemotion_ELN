class AddIpToAuthenticationKey < ActiveRecord::Migration
  def change
    add_column :authentication_keys, :ip, :inet
  end
end
