class AddMicromoleculeReferenceAndSampleDetailsToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :sample_type, :string
    add_column :samples, :sample_details, :jsonb

    add_reference :samples, :micromolecule, foreign_key: { to_table: :samples }
  end
end
