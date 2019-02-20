class AddDurationToReaction < ActiveRecord::Migration
  def change
    add_column :reactions, :duration, :string
  end
end
