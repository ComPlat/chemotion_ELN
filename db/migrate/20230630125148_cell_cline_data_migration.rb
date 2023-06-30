class CellClineDataMigration < ActiveRecord::Migration[6.1]
  def up
    User.all.each do |user|
      user.counters['celllines']="0"
      user.update_column(:counters, user.counters)
    end
  end
end
