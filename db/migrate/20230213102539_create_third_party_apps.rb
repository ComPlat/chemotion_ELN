class CreateThirdPartyApps < ActiveRecord::Migration[6.1]
  def change
    create_table :third_party_apps do |t|
      t.string :ip_address
      t.string :name
      t.string :password
      t.timestamps
    end
  end
end
