# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ReactionProcessStep', '#step_automation_status' do
  let(:reaction_process) { create_default(:reaction_process) }
  let!(:reaction_process_steps) { create_list(:reaction_process_step, 2, reaction_process: reaction_process) }

  let!(:predecessor_activity) do
    create(:reaction_process_activity,
           reaction_process_step: reaction_process_steps[0],
           workup: { AUTOMATION_STATUS: predecessor_step_activity_status })
  end

  let!(:activity) do
    create(:reaction_process_activity,
           reaction_process_step: reaction_process_steps[1],
           workup: { AUTOMATION_STATUS: current_step_activity_status })
  end

  before do
    predecessor_activity
    activity
  end

  context 'when all activities COMPLETED' do
    let(:predecessor_step_activity_status) { 'HALT' }
    let(:current_step_activity_status) { 'COMPLETED' }

    it 'STEP_COMPLETED' do
      expect(reaction_process_steps[1].step_automation_status).to eq 'STEP_COMPLETED'
    end

    it 'ignores override STEP_MANUAL_PROCEED' do
      reaction_process_steps[1].automation_status = 'STEP_MANUAL_PROCEED'

      expect(reaction_process_steps[1].step_automation_status).to eq 'STEP_COMPLETED'
    end
  end

  context 'when no predecessors blocks' do
    let(:predecessor_step_activity_status) { 'RUN' }
    let(:current_step_activity_status) { 'HALT' }

    it 'STEP_CAN_RUN' do
      expect(reaction_process_steps[1].step_automation_status).to eq 'STEP_CAN_RUN'
    end

    it 'ignores override STEP_MANUAL_PROCEED' do
      reaction_process_steps[1].automation_status = 'STEP_MANUAL_PROCEED'

      expect(reaction_process_steps[1].step_automation_status).to eq 'STEP_CAN_RUN'
    end
  end

  context 'when predecessors blocks' do
    let(:predecessor_step_activity_status) { 'HALT' }
    let(:current_step_activity_status) { 'RUN' }

    it 'defaults to STEP_HALT_BY_PRECEDING' do
      expect(reaction_process_steps[1].step_automation_status).to eq 'STEP_HALT_BY_PRECEDING'
    end

    it 'can be overridden to STEP_MANUAL_PROCEED' do
      reaction_process_steps[1].automation_status = 'STEP_MANUAL_PROCEED'

      expect(reaction_process_steps[1].step_automation_status).to eq 'STEP_MANUAL_PROCEED'
    end
  end
end
