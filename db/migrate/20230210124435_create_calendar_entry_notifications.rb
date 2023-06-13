class CreateCalendarEntryNotifications < ActiveRecord::Migration[6.1]
  def change
    create_table :calendar_entry_notifications do |t|
      t.belongs_to :user, index: true
      t.belongs_to :calendar_entry, index: true
      t.integer :status, default: 0

      t.timestamps
    end
  end
end
