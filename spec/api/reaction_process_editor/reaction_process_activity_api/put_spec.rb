# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessActivityAPI, '.put' do
  include RequestSpecHelper

  subject(:put_activity_request) do
    put("/api/v1/reaction_process_editor/reaction_process_activities/#{activity.id}",
        params: update_activity_params.to_json,
        headers: authorization_header)
  end

  let!(:reaction_process_step) { create_default(:reaction_process_step) }
  let!(:sample) { create(:valid_sample, reaction: reaction_process_step.reaction) }
  let(:update_activity_params) do
    { activity:
      { workup: workup_hash }.deep_stringify_keys }
  end
  let(:workup_hash) do
    {
      'acts_as' => 'SAMPLE',
      'sample_id' => sample.id.to_s,
      'target_amount' => { value: '5', unit: 'l' },
    }.deep_stringify_keys
  end
  let(:expected_update_activity_hash) do
    { 'reaction_process_activity' => hash_including(
      {
        'workup' => hash_including(workup_hash),
      },
    ) }
  end
  let!(:activity) { create(:reaction_process_activity_add_sample) }

  let(:authorization_header) { authorized_header(activity.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'triggers ReactionProcessActivities::Update' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::Update).to receive(:execute!)
    put_activity_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::Update).to have_received(:execute!).with(
      activity: activity, activity_params: update_activity_params[:activity],
    )
  end

  it 'triggers ReactionProcesses::ReactionProcessVessels::SweepUnused' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused).to receive(:execute!)

    put_activity_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused).to have_received(:execute!).with(
      reaction_process_id: reaction_process_step.reaction_process_id,
    )
  end

  it 'updates action' do
    expect { put_activity_request }.to change {
      activity.reload.workup
    }.from(
      hash_including({ 'acts_as' => 'SAMPLE', 'target_amount' => { value: '500', unit: 'ml' } }.deep_stringify_keys),
    ).to(
      workup_hash,
    )
  end

  it 'returns reaction_process_activity' do
    put_activity_request
    expect(parsed_json_response).to include(expected_update_activity_hash)
  end
end
