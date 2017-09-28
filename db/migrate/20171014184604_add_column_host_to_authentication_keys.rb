class AddColumnHostToAuthenticationKeys < ActiveRecord::Migration
  def change
    add_column :authentication_keys, :fqdn, :string
  end
end
