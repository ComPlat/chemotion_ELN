class AddMissingAttributesToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :purity, :float
    add_column :samples, :solvent, :string, :default => ""
    add_column :samples, :impurities, :string, :default => ""
    add_column :samples, :location, :string, :default => ""
  end
end
