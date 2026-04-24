class AddTwoFactorFieldsToUsers < ActiveRecord::Migration[6.1]
  def change
    add_column :users, :encrypted_otp_secret, :string
    add_column :users, :encrypted_otp_secret_iv, :string
    add_column :users, :encrypted_otp_secret_salt, :string
    add_column :users, :consumed_timestep, :integer
    add_column :users, :otp_required_for_login, :boolean
    add_column :users, :otp_backup_codes, :string, array: true
  end
end
