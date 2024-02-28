class AddSampleTypeNameToSample < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :sample_type_name, :string, :default => 'Micromolecule'
  end
end
