class CellClineDataMigration < ActiveRecord::Migration[6.1]
  def up
    User.all.each do |user|
      user.counters['celllines']="0"
      user.update_column(:counters, user.counters)
    end

    Profile.all.each do |profile|
      profile.data['layout']['cell_line']=-1000
      profile.save
    end
  end
end
