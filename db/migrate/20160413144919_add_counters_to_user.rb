class AddCountersToUser < ActiveRecord::Migration
  def change
    add_column :users, :counters, :hstore, null: false, default: {
      reactions: 0,
      wellplates: 0
    }
  end
end
