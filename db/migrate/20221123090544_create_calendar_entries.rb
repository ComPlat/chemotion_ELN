class CreateCalendarEntries < ActiveRecord::Migration[5.2]
  def change
    create_table :calendar_entries do |t|
      t.string :title
      t.string :description
      t.datetime :start_time
      t.datetime :end_time
      t.string :kind
      t.integer :created_by, null: false, index: true
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false

      t.belongs_to :eventable, polymorphic: true, index: true
    end
  end
end
