class AddAutomationResponseToReactionProcessActivities < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_process_activities, :automation_response, :jsonb
  end
end
