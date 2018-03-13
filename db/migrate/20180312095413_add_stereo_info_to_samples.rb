class AddStereoInfoToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :stereo, :jsonb
  end
end
