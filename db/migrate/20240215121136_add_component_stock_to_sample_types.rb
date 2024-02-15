class AddComponentStockToSampleTypes < ActiveRecord::Migration[6.1]
  def change
    add_column :sample_types, :component_stock, :boolean, :default => false 
  end
end
