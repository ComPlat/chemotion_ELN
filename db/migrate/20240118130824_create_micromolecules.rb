class CreateMicromolecules < ActiveRecord::Migration[6.1]
  def change
    create_table :micromolecules do |t|
      t.string :name
      t.binary :molfile
      t.string :molfile_version, limit: 20
      t.jsonb :stereo

      t.timestamps
    end
  end
end
