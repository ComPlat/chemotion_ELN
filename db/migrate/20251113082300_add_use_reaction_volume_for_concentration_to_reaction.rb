class AddUseReactionVolumeForConcentrationToReaction < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :use_reaction_volume_for_concentration, :boolean, default: false, null: false
  end
end

