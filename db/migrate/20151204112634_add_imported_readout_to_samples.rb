class AddImportedReadoutToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :imported_readout, :string
  end
end
