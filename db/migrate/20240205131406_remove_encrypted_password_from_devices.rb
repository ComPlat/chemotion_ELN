class RemoveEncryptedPasswordFromDevices < ActiveRecord::Migration[6.1]
  def up
    remove_column :devices, :encrypted_password
  end

  def down
    add_column :devices, :encrypted_password, :string
  end
end
