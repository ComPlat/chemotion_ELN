# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcessVessels
      class SweepUnused
        def self.execute!(reaction_process_id:)
          persisted_vessel_ids = ::ReactionProcessEditor::ReactionProcessVessel
                                 .where(reaction_process_id: reaction_process_id).pluck(:id)

          current_steps = ::ReactionProcessEditor::ReactionProcessStep.where(reaction_process_id: reaction_process_id)
          current_activities = ::ReactionProcessEditor::ReactionProcessActivity.where(
            reaction_process_step_id: current_steps.pluck(:id),
          )
          current_process = ::ReactionProcessEditor::ReactionProcess.find_by(id: reaction_process_id)

          current_step_vessel_ids = current_steps.pluck(:reaction_process_vessel_id).uniq
          current_activity_vessel_ids = current_activities.pluck(:reaction_process_vessel_id).compact.uniq

          current_process_vessel_ids = [current_process.reaction_process_vessel_id].compact

          current_vessel_ids = (current_step_vessel_ids + current_activity_vessel_ids + current_process_vessel_ids).uniq

          obsolete_vessel_ids = persisted_vessel_ids - current_vessel_ids

          ::ReactionProcessEditor::ReactionProcessVessel.where(id: obsolete_vessel_ids).destroy_all
        end
      end
    end
  end
end
