class AddDurationToReaction < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions, :duration, :string
  end
end
