class SetDefaultCounters < ActiveRecord::Migration[4.2]
  def change
    d = {
      samples: 0,
      reactions: 0,
      wellplates: 0
    }
    change_column :users, :counters, :hstore, null: false, default: d
  end
end
