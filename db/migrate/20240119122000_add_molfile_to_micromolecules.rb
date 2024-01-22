class AddMolfileToMicromolecules < ActiveRecord::Migration[6.1]
  def change
    add_column :micromolecules, :molfile, :binary
    add_column :micromolecules, :molfile_version, :string, limit: 20
    add_column :micromolecules, :stereo, :jsonb
  end
end
