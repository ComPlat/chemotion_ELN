class MigrateLayoutToProfileInt < ActiveRecord::Migration
  def up
    User.where(type: 'Person').find_each do |user|
      profile = Profile.find_by(user_id: user.id)
      next if profile.nil?
      node = user.layout
      node.each{|k, v| node[k] = v.to_i }
      layout = {}
      layout['layout'] = node
      profile.data = layout || {} if profile.data.nil?
      profile.data.merge!(layout) unless profile.data.nil?
      profile.save!
    end
  end

  def down
    Profile.find_each do |profile|
      profile.data.delete_if {|key, value| key >= "layout" }  unless (profile.data.nil?)
      profile.save!
    end
  end


end
