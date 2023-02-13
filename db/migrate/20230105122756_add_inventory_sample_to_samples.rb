class AddInventorySampleToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :inventory_sample, :boolean, default: false
    add_index :samples, :inventory_sample
  end
end
