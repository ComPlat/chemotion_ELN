class AddSampleTypeAndDetailsToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :sample_type, :string, default: 'Micromolecule'
    add_column :samples, :sample_details, :jsonb
  end
end
