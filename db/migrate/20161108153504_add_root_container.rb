class AddRootContainer < ActiveRecord::Migration
  def up
    Sample.find_each do |s|
      if s.container == nil
        root_con = Container.new
        root_con.name = "root"
        s.container = root_con
        s.save!
      end
    end
  end

  def down
  end
end
