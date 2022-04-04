class AddRfValueToSamples < ActiveRecord::Migration[5.2]
  def change
    add_column :samples, :rf_value, :jsonb
  end
end
