# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessStepAPI, '.put' do
  include RequestSpecHelper

  subject(:put_reaction_process_request) do
    put("/api/v1/reaction_process_editor/reaction_process_steps/#{reaction_process_step.id}",
        params: { reaction_process_step: { name: 'New Step Name', locked: true } }.to_json,
        headers: authorization_header)
  end

  let!(:reaction_process_step) { create(:reaction_process_step, :with_vessel) }
  let(:authorization_header) { authorized_header(reaction_process_step.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'updates process_step' do
    expect do
      put_reaction_process_request
    end.to change { reaction_process_step.reload.name }.to('New Step Name')
  end

  it 'updates lock' do
    expect do
      put_reaction_process_request
    end.to change { reaction_process_step.reload.locked }.from(nil).to(true)
  end
end
