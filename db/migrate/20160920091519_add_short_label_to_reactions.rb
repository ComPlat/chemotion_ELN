class AddShortLabelToReactions < ActiveRecord::Migration
  def up
    add_column :reactions, :short_label, :string
  end
  def down
    remove_column :reactions, :short_label, :string
  end
end
