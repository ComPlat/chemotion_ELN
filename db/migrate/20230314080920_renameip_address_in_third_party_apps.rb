class RenameipAddressInThirdPartyApps < ActiveRecord::Migration[6.1]
  def change
    rename_column :third_party_apps, :ip_address, :IPAddress
    rename_column :third_party_apps, :password, :secret
  end
end
