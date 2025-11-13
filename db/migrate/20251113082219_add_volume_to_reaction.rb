class AddVolumeToReaction < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :volume, :decimal, precision: 10, scale: 4
    add_column :reactions, :use_reaction_volume, :boolean, default: false, null: false
  end
end

