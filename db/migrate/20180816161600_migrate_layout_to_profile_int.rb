class MigrateLayoutToProfileInt < ActiveRecord::Migration
  def change
    Profile.find_each do |pr|
      d = pr.data || {}
      l = d['layout']
      l.each_pair{|k, v| l[k] = v.to_i } if l
      pr.update!(data: d)
    end
  end
end
