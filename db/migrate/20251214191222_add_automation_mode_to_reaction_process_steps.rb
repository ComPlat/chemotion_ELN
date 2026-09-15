class AddAutomationModeToReactionProcessSteps < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_process_steps, :automation_mode, :string
  end
end
