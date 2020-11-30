class AddMolfileVersionToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :molfile_version, :string, limit: 20
    add_column :molecules, :molfile_version, :string, limit: 20
  end
end
