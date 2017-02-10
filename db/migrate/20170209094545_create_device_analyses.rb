class CreateDeviceAnalyses < ActiveRecord::Migration
  def change
    create_table :devices_analyses do |t|
      t.integer :sample_id, null: false
      t.integer :device_id, null: false
      t.string :analysis_type

      t.timestamps null: false
    end

    create_table :analyses_experiments do |t|
      t.integer :holder_id
      t.string :status
      t.integer :devices_analysis_id, null: false
      t.string :solvent
      t.string :experiment
      t.boolean :checkbox
      t.boolean :on_day
      t.integer :number_of_scans
      t.integer :numeric
      t.string :time

      t.timestamps null: false
    end

  end
end
