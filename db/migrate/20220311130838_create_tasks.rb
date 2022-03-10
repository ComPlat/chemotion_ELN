class CreateTasks < ActiveRecord::Migration[5.2]
  def change
    create_table :tasks do |t|
      t.string "status", default: 'To do'
      t.integer "measurement_value", null: true
      t.string "measurement_unit", null: false, default: 'g'
      t.string "description", null: true
      t.string "private_note", null: true
      t.string "additional_note", null: true
      t.datetime "created_at",  null: false
      t.integer "created_by", null: false
      t.datetime "updated_at"
      t.references :sample, index: true, foreign_key: true
    end
  end
end
