class AddSampleMetrics < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :metrics, :string, default: 'mmm'
  end
end
