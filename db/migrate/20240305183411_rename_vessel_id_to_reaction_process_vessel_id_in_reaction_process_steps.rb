# frozen_string_literal: true

class RenameVesselIdToReactionProcessVesselIdInReactionProcessSteps < ActiveRecord::Migration[6.1]
  def up
    rename_column :reaction_process_steps, :vessel_id, :reaction_process_vessel_id
  end

  def down
    rename_column :reaction_process_steps, :reaction_process_vessel_id, :vessel_id
  end
end
