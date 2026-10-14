# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessStepAPI, '.delete' do
  include RequestSpecHelper

  subject(:delete_reaction_process_step_request) do
    delete("/api/v1/reaction_process_editor/reaction_process_steps/#{reaction_process_step.id}",
           headers: authorization_header)
  end

  let!(:reaction_process_step) { create(:reaction_process_step) }

  let(:authorization_header) { authorized_header(reaction_process_step.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'triggers UseCase ReactionProcessSteps::Destroy' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessSteps::Destroy).to receive(:execute!)
    delete_reaction_process_step_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessSteps::Destroy)
      .to have_received(:execute!).with(reaction_process_step: reaction_process_step)
  end

  it 'triggers UseCase ReactionProcessEditor::ReactionProcessVessels::SweepUnused' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused).to receive(:execute!)
    delete_reaction_process_step_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused)
      .to have_received(:execute!).with(reaction_process_id: reaction_process_step.reaction_process_id)
  end
end
