class CreateDeviceAnalyses < ActiveRecord::Migration
  def change
    create_table :devices_analyses do |t|
      t.integer :device_id, null: false
      t.string :analysis_type

      t.timestamps null: false
    end

    create_table :analyses_experiments do |t|
      t.integer :sample_id
      t.integer :holder_id
      t.string :status
      t.integer :devices_analysis_id, null: false
      t.string :solvent
      t.string :experiment
      t.boolean :priority
      t.boolean :on_day
      t.integer :number_of_scans
      t.integer :sweep_width
      t.string :time

      t.timestamps null: false
    end

    change_table :devices_samples do |t|
       t.string :types, array: true, default: []
    end
  end
end
