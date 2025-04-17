# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessActivityAPI, '.append_pooling_groups' do
  include RequestSpecHelper

  subject(:put_append_pooling_groups_request) do
    put("/api/v1/reaction_process_editor/reaction_process_activities/#{activity.id}/append_pooling_groups",
        params: pooling_group_params.to_json,
        headers: authorization_header)
  end

  let!(:activity) { create(:reaction_process_activity_add_sample, position: 3) }

  let(:pooling_group_params) do
    { pooling_groups: [{ followup_action: 'DISCARD' }, { followup_action: 'EVAPORATE' }] }
  end

  let(:authorization_header) { authorized_header(activity.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendPoolingGroupActivity' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendPoolingGroupActivity).to receive(:execute!)
    put_append_pooling_groups_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendPoolingGroupActivity)
      .to have_received(:execute!)
      .with({ reaction_process_step: anything, pooling_group_params: { followup_action: 'DISCARD' }, position: 4 })

    expect(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendPoolingGroupActivity)
      .to have_received(:execute!)
      .with({ reaction_process_step: anything, pooling_group_params: { followup_action: 'EVAPORATE' }, position: 5 })
  end

  it 'updates activity AUTOMATION_STATUS' do
    expect { put_append_pooling_groups_request }.to change {
      activity.reload.workup['AUTOMATION_STATUS']
    }.to('HALT_RESOLVED_NEEDS_CONFIRMATION')
  end
end
