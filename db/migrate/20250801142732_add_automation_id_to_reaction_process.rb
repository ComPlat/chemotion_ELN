class AddAutomationIdToReactionProcess < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_processes, :automation_ordinal, :integer
  end
end
