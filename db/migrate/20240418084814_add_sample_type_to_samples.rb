class AddSampleTypeToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :sample_type, :string
  end
end
