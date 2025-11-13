class AddReactionProcessVesselIdToReactionProcess < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_processes, :reaction_process_vessel_id, :uuid
  end
end
