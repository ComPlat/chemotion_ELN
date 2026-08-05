# frozen_string_literal: true

class AddLockReactionVolumeToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :lock_reaction_volume, :boolean, default: false, null: false
  end
end
