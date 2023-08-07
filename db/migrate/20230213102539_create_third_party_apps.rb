class CreateThirdPartyApps < ActiveRecord::Migration[6.1]
  def change
    create_table :third_party_apps do |t|
      t.string :IPAddress
      t.string :name
      t.timestamps
    end
  end
end
