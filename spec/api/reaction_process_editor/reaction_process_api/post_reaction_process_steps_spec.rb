# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.post /reaction_process_steps' do
  include RequestSpecHelper
  subject(:api_call) do
    post("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}/reaction_process_steps",
         headers: authorization_header,
         params: { reaction_process_step: {
           name: step_name,
           reaction_process_vessel: reaction_process_vessel_params,
         } }.to_json)
  end

  let!(:reaction_process) { create_default(:reaction_process) }
  let(:step_name) { 'The new Step' }

  let(:created_process_step) { reaction_process.reaction_process_steps.order(created_at: :asc).last }

  let(:authorization_header) { authorized_header(reaction_process.creator) }

  let(:vessel) { create(:vessel) }
  let(:reaction_process_vessel_params) do
    { vesselable_id: vessel.id, vesselable_type: 'Vessel', preparations: ['DRIED'] }
  end

  it_behaves_like 'authorization restricted API call'

  it 'responds 201' do
    api_call
    expect(response).to have_http_status :created
  end

  it 'creates ReactionProcessStep' do
    expect do
      api_call
    end.to(
      change { reaction_process.reload.reaction_process_steps.length }.by(1),
    )
  end

  it 'triggers UseCase ReactionProcessVessels::CreateOrUpdate' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate).to receive(:execute!)

    api_call

    expect(Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate).to have_received(:execute!).with(
      reaction_process_id: reaction_process.id,
      reaction_process_vessel_params: reaction_process_vessel_params,
    )
  end

  it 'triggers UseCase ReactionProcessVessels::SweepUnused' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused).to receive(:execute!)

    api_call

    expect(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused).to have_received(:execute!).with(
      reaction_process_id: reaction_process.id,
    )
  end

  it 'sets ReactionProcessVessels' do
    api_call
    expect(created_process_step.reaction_process_vessel_id).to be_present
  end

  it 'sets position' do
    create(:reaction_process_step) # provides us with a more meaningful expectation "position == 1".
    api_call
    expect(created_process_step.position).to eq 1
  end

  context 'without name' do
    let(:step_name) { '' }

    it 'sets default name' do
      api_call
      expect(created_process_step.name).to eq 'Step 1'
    end
  end
end
