class RemoveSamplesCounterColumn < ActiveRecord::Migration
  def change
    remove_column :users, :samples_created_count

    User.find_each &:restore_counters_data
  end
end
