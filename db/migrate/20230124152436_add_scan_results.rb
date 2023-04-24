class AddScanResults < ActiveRecord::Migration[6.1]
  def change
    create_table :scan_results, if_not_exists: true do |t|
      t.float :measurement_value, null: false
      t.string :measurement_unit, null: false, default: 'g'
      t.string :title, null: true
      t.integer :position, null: false, default: 0
      t.belongs_to :sample_task
      t.timestamps
    end
  end
end
