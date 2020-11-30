class AddStereoInfoToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :stereo, :jsonb
  end
end
