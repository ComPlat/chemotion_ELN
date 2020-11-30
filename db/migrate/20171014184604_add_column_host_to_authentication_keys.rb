class AddColumnHostToAuthenticationKeys < ActiveRecord::Migration[4.2]
  def change
    add_column :authentication_keys, :fqdn, :string
  end
end
