class AddOriginToReaction < ActiveRecord::Migration
  def change
    add_column :reactions, :origin, :jsonb
  end
end
