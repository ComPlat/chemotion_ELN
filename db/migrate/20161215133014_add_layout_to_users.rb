class AddLayoutToUsers < ActiveRecord::Migration
  def change
    add_column :users, :layout, :hstore, null: false, default: {
      sample: 1,
      reaction: 2,
      wellplate: 3,
      screen: 4
    }
  end
end
