class AddTopSecretToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :is_top_secret, :boolean, default: false
  end
end
