class AddSampleMetrics < ActiveRecord::Migration
  def change
    add_column :samples, :metrics, :string, default: 'mmm'
  end
end
