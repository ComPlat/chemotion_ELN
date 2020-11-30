class AddShortLabelToReactions < ActiveRecord::Migration[4.2]
  def up
    add_column :reactions, :short_label, :string
  end
  def down
    remove_column :reactions, :short_label, :string
  end
end
