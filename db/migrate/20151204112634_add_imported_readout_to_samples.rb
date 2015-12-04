class AddImportedReadoutToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :imported_readout, :string
  end
end
