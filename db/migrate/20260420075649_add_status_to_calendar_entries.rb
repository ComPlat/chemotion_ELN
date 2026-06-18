class AddStatusToCalendarEntries < ActiveRecord::Migration[6.1]
  def change
    add_column :calendar_entries, :status, :string
  end
end
