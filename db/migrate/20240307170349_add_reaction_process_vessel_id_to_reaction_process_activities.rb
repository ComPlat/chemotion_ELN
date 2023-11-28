# frozen_string_literal: true

class AddReactionProcessVesselIdToReactionProcessActivities < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_process_activities, :reaction_process_vessel_id, :uuid
  end
end
