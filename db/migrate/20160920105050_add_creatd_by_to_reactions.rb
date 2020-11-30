class AddCreatdByToReactions < ActiveRecord::Migration[4.2]
  def up
    add_column :reactions, :created_by, :integer
  end
  def down
    remove_column :reactions, :created_by, :integer
  end
end
