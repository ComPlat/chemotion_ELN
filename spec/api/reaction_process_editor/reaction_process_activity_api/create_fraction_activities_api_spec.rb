# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessActivityAPI, '.create_fraction_activities' do
  include RequestSpecHelper

  subject(:put_append_fraction_request) do
    put("/api/v1/reaction_process_editor/reaction_process_activities/#{activity.id}/create_fraction_activities",
        params: pooling_group_params.to_json,
        headers: authorization_header)
  end

  let!(:activity) { create(:reaction_process_activity_add_sample, position: 3) }

  let(:pooling_group_params) do
    { fractions: [
      { consuming_activity_name: 'DISCARD', vials: %w[1 2] },
      { consuming_activity_name: 'EVAPORATE', vials: %w[3] },
    ] }
  end

  let(:authorization_header) { authorized_header(activity.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendFractionActivity' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendFractionActivity).to receive(:execute!)
    put_append_fraction_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendFractionActivity)
      .to have_received(:execute!)
      .with({ parent_activity: anything,
              fraction_params: { consuming_activity_name: 'DISCARD', vials: %w[1 2] },
              index: 0 })

    expect(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendFractionActivity)
      .to have_received(:execute!)
      .with({ parent_activity: anything,
              fraction_params: { consuming_activity_name: 'EVAPORATE', vials: %w[3] },
              index: 1 })
  end

  it 'updates activity AUTOMATION_STATUS' do
    expect { put_append_fraction_request }.to change {
      activity.reload.workup['AUTOMATION_STATUS']
    }.to('HALT_RESOLVED_NEEDS_CONFIRMATION')
  end
end
