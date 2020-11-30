class AddTopSecretToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :is_top_secret, :boolean, default: false
  end
end
