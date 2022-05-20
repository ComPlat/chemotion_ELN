class CreateMeasurements < ActiveRecord::Migration[5.2]
  def change
    create_table :measurements do |t|
      t.string :description, null: false
      t.decimal :value, null: false
      t.string :unit, null: false # TODO klären ob irgendwas einheitenlos sein darf
      t.datetime :deleted_at, index: true

      t.belongs_to :well, index: true, null: true
      t.belongs_to :sample, index: true, null: false
      t.timestamps null: false
    end
  end
end
