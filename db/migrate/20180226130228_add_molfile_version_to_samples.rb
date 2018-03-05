class AddMolfileVersionToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :molfile_version, :string, limit: 20
    add_column :molecules, :molfile_version, :string, limit: 20
  end
end
