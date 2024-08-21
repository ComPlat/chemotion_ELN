class AddGaseousToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :gaseous, :boolean, null: true, default: false
  end
end
