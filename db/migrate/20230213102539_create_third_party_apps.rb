class CreateThirdPartyApps < ActiveRecord::Migration[6.1]
  def change
    create_table :third_party_apps do |t|
      t.string :url
      t.string :name, null: false, index: { unique: true }, limit: 100
      t.string :file_types, limit: 100
      t.timestamps
    end
  end
end
