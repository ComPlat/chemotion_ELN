class SetDefaultCounters < ActiveRecord::Migration
  def change
    d = {
      samples: 0,
      reactions: 0,
      wellplates: 0
    }
    change_column :users, :counters, :hstore, null: false, default: d
  end
end
