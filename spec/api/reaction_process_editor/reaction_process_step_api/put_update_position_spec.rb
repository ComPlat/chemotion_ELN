# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessStepAPI, '.put /update_position' do
  include RequestSpecHelper
  subject(:put_reaction_process_request) do
    put("/api/v1/reaction_process_editor/reaction_process_steps/#{reaction_process_step.id}/update_position",
        params: { position: position }.to_json,
        headers: authorization_header)
  end

  let(:position) { 2 }
  let(:reaction_process_step) { create(:reaction_process_step) }

  let(:authorization_header) { authorized_header(reaction_process_step.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'triggers UseCase ReactionProcessSteps::UpdatePosition' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessSteps::UpdatePosition).to receive(:execute!)

    put_reaction_process_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessSteps::UpdatePosition).to have_received(:execute!).with(
      reaction_process_step: reaction_process_step, position: position,
    )
  end
end
