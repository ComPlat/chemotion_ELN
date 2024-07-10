class AddFileTypesToThirdPartyApps < ActiveRecord::Migration[6.1]
  def change
    add_column :third_party_apps, :file_types, :string, limit: 100
  end
end
