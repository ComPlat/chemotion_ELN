class AddAutomationStatusToReactionProcessSteps < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_process_steps, :automation_status, :string
  end
end
