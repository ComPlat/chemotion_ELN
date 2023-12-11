# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessStepAPI, '.put /vessel' do
  include RequestSpecHelper

  subject(:api_call) do
    put("/api/v1/reaction_process_editor/reaction_process_steps/#{reaction_process_step.id}/vessel",
        params: { vessel_id: vessel_id }.to_json,
        headers: authorization_header)
  end

  let!(:reaction_process_step) { create(:reaction_process_step, :with_vessel) }
  let!(:authorization_header) { authorized_header(reaction_process_step.creator) }

  let!(:vessel) { create(:vessel) }
  let(:vessel_id) { vessel.id }

  it_behaves_like 'authorization restricted API call'

  describe 'assign vessel' do
    it 'sets vessel' do
      expect do
        api_call
      end.to change { reaction_process_step.reload.vessel }.to(vessel)
    end
  end

  describe 'assign nil' do
    let(:vessel_id) { nil }

    it 'removes vessel' do
      expect do
        api_call
      end.to change { reaction_process_step.reload.vessel }.to(nil)
    end
  end
end
