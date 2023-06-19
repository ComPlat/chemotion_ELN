class RemovesecretFromThirdPartyApp < ActiveRecord::Migration[6.1]
  def change
    remove_column :third_party_apps, :secret
  end
end
