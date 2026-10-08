class RenameReactionProcessStepToReactionIdProcessActivityIdInReactionsSamples < ActiveRecord::Migration[6.1]
  def change
    rename_column :reactions_samples, :reaction_process_step_id, :reaction_process_activity_id
  end
end
