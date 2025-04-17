# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ReactionProcessStep', '#halts_automation?' do
  let!(:reaction_process_step) { create_default(:reaction_process_step) }
  let!(:reaction_process_activity) { create(:reaction_process_activity) }

  %w[HALT AUTOMATION_RESPONDED HALT_RESOLVED_NEEDS_CONFIRMATION].each do |status|
    it "with Activity in state #{status} -> true" do
      reaction_process_activity.workup['AUTOMATION_STATUS'] = status
      reaction_process_activity.save
      expect(reaction_process_step.halts_automation?).to be true
    end
  end

  %w[RUN HALT_RESOLVED COMPLETED].each do |status|
    it "with Activity in state #{status} -> false" do
      reaction_process_activity.workup['AUTOMATION_STATUS'] = status
      reaction_process_activity.save
      expect(reaction_process_step.halts_automation?).to be false
    end
  end
end
