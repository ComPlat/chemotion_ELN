class DefaultRecentProfile < ActiveRecord::Migration

  CHMO = ['CHMO:0000593', 'CHMO:0000595', 'CHMO:0000470', 'CHMO:0001075', 'CHMO:0000497', 'CHMO:0001009', 'CHMO:0000630', 'CHMO:0001007', 'CHMO:0000156', 'BFO:0000015']

  def up
    us = User.all
    us.each do |u|
      profile = u.profile
      data = profile.data || {}
      data.merge!(chmo: CHMO)
      # use update_columns to bypass updated_at
      u.profile.update_columns(data: data)
    end
  end

  def down
    us = User.all
    us.each do |u|
      profile = u.profile
      data = profile.data
      next if data.nil?
      data.delete('chmo')
      # use update_columns to bypass updated_at
      u.profile.update_columns(data: data)
    end
  end
end
