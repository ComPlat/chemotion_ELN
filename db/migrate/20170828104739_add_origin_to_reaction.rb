class AddOriginToReaction < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions, :origin, :jsonb
  end
end
