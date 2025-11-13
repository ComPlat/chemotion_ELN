class ChangeColumnSampleSetupInReactionProcesses < ActiveRecord::Migration[6.1]
  def change
    rename_column :reaction_processes, :sample_initial_info, :sample_setup
  end
end
