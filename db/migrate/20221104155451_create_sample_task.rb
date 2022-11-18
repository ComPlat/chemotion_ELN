class CreateSampleTask < ActiveRecord::Migration[5.2]
  def change
    create_table :sample_tasks do |t|
      t.float :measurement_value, null: true
      t.string :measurement_unit, null: false, default: 'g'
      t.string :description
      t.string :private_note
      t.string :additional_note
      t.references :creator, foreign_key: { to_table: :users }, null: false
      t.references :sample, foreign_key: true, null: true
      t.timestamps
    end
  end
end
