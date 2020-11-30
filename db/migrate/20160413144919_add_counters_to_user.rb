class AddCountersToUser < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :counters, :hstore, null: false, default: {
      reactions: 0,
      wellplates: 0
    }
  end
end
